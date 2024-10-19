import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import http from 'http';
import https from 'https';
import {
  TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Typography, Box, Grid,
  createTheme, ThemeProvider, CssBaseline, Switch, FormControlLabel
} from '@mui/material';
import * as XLSX from 'xlsx';
const httpAgent = new http.Agent({ rejectUnauthorized: false });
const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // For both HTTP and HTTPS (if needed)
const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

function App() {
  const [cins, setCins] = useState(['']);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleCinChange = (event, index) => {
    const newCins = [...cins];
    newCins[index] = event.target.value;
    setCins(newCins);
  };

  const addCinField = () => {
    setCins([...cins, '']);
  };

  const fetchBRSRReports = async () => {
    setLoading(true);
    setError(null);
    const newReports = [];

    try {
      for (const cin of cins) {
        if (cin.trim() !== '') {
        const response = await axios.get(`http://20.197.35.82:8000/brsr-report/?cin=${cin}`, {
          httpAgent,  // Use the custom agent
          httpsAgent, // use the custom https agent
          withCredentials: false
          });
          newReports.push(response.data.parsed_response);
        }
      }
      setReports(newReports);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError("One or more CINs not found.");
      } else if (err.response && err.response.status === 400) {
        setError("Bad request, check if your API endpoint exists and is functional")
      } else {
        setError("Error fetching data. Please try again later.");
        console.error("API Error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const extractMetric = (report, metricName) => {
    if (!report || !report.elements) return "N/A";
    const metric = report.elements.find(el => el.element_name === metricName);
    return metric ? metric.fact_value : "N/A";
  };

  const allMetricNames = new Set();
  reports.forEach(r => {
    if (r && r.elements) {
      r.elements.forEach(element => allMetricNames.add(element.element_name));
    }
  });
  const metrics = Array.from(allMetricNames);


  const transposedData = reports.length > 0 ? Object.keys(reports[0].elements).map((elementKey) => {
    const elementName = reports[0].elements[elementKey].element_name;
    return ({
      metric: elementName,
      values: reports.map(report => {
        const targetElement = report.elements[elementKey];
        return targetElement ? targetElement.fact_value : "N/A";
      })
    })
  }) : [];



  const exportToExcel = () => {
    if (reports.length === 0) {
      alert('No data to export.');
      return;
    }

    const wb = XLSX.utils.book_new();

    reports.forEach((report, reportIndex) => {
      const ws_name = extractMetric(report, "NameOfTheCompany") || `Company ${reportIndex + 1}`;
      const excelRows = [];
      const headerRow = ["Metric"];
      reports.forEach((r, i) => headerRow.push(extractMetric(r, "NameOfTheCompany") || `Company ${i + 1}`));
      excelRows.push(headerRow);

      metrics.forEach(metric => {
        const row = [metric];
        reports.forEach(r => {
          const value = extractMetric(r, metric);
          row.push(String(value)); 
        });
        excelRows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(excelRows);
      XLSX.utils.book_append_sheet(wb, ws, ws_name);

    });

    XLSX.writeFile(wb, 'brsr_comparison.xlsx');
  };



  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        ...defaultTheme,
        palette: {
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode],
  );

  const tableCellStyles = {
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    verticalAlign: 'top',
    padding: '4px',
    lineHeight: 1.2,
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Typography variant="h4">BRSR Report Comparator</Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={handleDarkModeToggle} />}
            label="Dark Mode"
          />
        </Box>

        <Grid container spacing={2} sx={{ marginBottom: '20px' }}>
          {cins.map((cin, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <TextField
                label={`CIN ${index + 1}`}
                value={cin}
                onChange={e => handleCinChange(e, index)}
                variant="outlined"
                fullWidth
              />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} sx={{ marginBottom: '20px' }}>
          <Grid item>
            <Button variant="contained" onClick={addCinField}>Add CIN</Button>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={fetchBRSRReports} disabled={loading}>Compare</Button>
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={exportToExcel} disabled={loading}>Export to Excel</Button>
          </Grid>
        </Grid>

        {loading && <CircularProgress style={{ marginTop: '20px' }} />}
        {error && <Typography variant="body1" color="error" style={{ marginTop: '20px' }}>{error}</Typography>}

        {reports.length > 0 && (
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableCellStyles }}>Metric</TableCell>
                  {reports.map((report, index) => (
                    <TableCell key={index} sx={{ ...tableCellStyles }}>
                      {extractMetric(report, "NameOfTheCompany") || `Company ${index + 1}`}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {transposedData.map((data, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ ...tableCellStyles }}>{data.metric}</TableCell>
                    {data.values.map((value, cinIndex) => (
                      <TableCell key={cinIndex} sx={{ ...tableCellStyles }}>{value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
