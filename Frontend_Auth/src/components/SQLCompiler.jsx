import React, { useState, useRef } from 'react';
import DataVisualization from './DataVisualization';

const SQLCompiler = ({ onBackToDashboard }) => {

  const [uploadedTables, setUploadedTables] = useState([]);

  const [activeQuery, setActiveQuery] = useState('');

  const [queryResults, setQueryResults] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

    const [showTableInfo, setShowTableInfo] = useState({});
  const [showVisualization, setShowVisualization] = useState(false);
  const fileInputRef = useRef(null);



  const handleFileUpload = (e) => {

    const files = Array.from(e.target.files);

    const newTables = files.map(file => ({

      id: Date.now() + Math.random(),

      name: file.name,

      file: file,

      preview: null,

      schema: null

    }));

   

    setUploadedTables(prev => [...prev, ...newTables]);

   

    // Process each file to get preview and schema

    newTables.forEach(table => {

      processFileForPreview(table);

    });

  };



  const processFileForPreview = async (table) => {

    try {

      const formData = new FormData();

      formData.append('file', table.file);

     

      const response = await fetch('http://localhost:8000/upload-and-analyze/', {

        method: 'POST',

        body: formData

      });

     

      if (response.ok) {

        const data = await response.json();

        setUploadedTables(prev => prev.map(t =>

          t.id === table.id

            ? { ...t, preview: data.data_preview, schema: data.schema }

            : t

        ));

      }

    } catch (error) {

      console.error('Error processing file:', error);

    }

  };



  const removeTable = (tableId) => {

    setUploadedTables(prev => prev.filter(t => t.id !== tableId));

    setShowTableInfo(prev => {

      const newState = { ...prev };

      delete newState[tableId];

      return newState;

    });

  };



  const executeQuery = async () => {

    if (!activeQuery.trim() || uploadedTables.length === 0) return;

   

    setIsLoading(true);

   

    try {

      console.log(`Executing query with ${uploadedTables.length} table(s)`);

     

      // Create a combined FormData with all tables and the query

      const formData = new FormData();

     

      // Always add the first table (required)

      formData.append('table_0', uploadedTables[0].file);

      formData.append('table_name_0', uploadedTables[0].name);

     

      // Add additional tables if they exist (up to 4 total tables)

      for (let i = 1; i < Math.min(uploadedTables.length, 5); i++) {

        formData.append(`table_${i}`, uploadedTables[i].file);

        formData.append(`table_name_${i}`, uploadedTables[i].name);

      }

     

      formData.append('question', activeQuery);

      formData.append('table_count', uploadedTables.length.toString());

     

      // Debug: Log FormData contents

      console.log('FormData contents:');

      for (let [key, value] of formData.entries()) {

        console.log(`${key}: ${value}`);

      }

     

      const response = await fetch('http://localhost:8000/advanced-sql-query/', {

        method: 'POST',

        body: formData

      });

     

      if (response.ok) {

        const data = await response.json();

        setQueryResults({

          sql: data.generated_sql,

          results: data.result,

          columns: data.result && data.result.length > 0 ? Object.keys(data.result[0]) : [],

          rows: data.result ? data.result.map(row => Object.values(row)) : []

        });

      } else {

        const errorData = await response.json();

        throw new Error(errorData.detail || 'Failed to execute query');

      }

    } catch (error) {

      console.error('Error executing query:', error);

      setQueryResults({

        error: error.message

      });

    } finally {

      setIsLoading(false);

    }

  };



  const exportResults = () => {

    if (!queryResults || queryResults.error) return;

   

    const csvContent = [

      queryResults.columns.join(','),

      ...queryResults.rows.map(row => row.join(','))

    ].join('\n');

   

    const blob = new Blob([csvContent], { type: 'text/csv' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `sql_query_results_${Date.now()}.csv`;

    a.click();

    window.URL.revokeObjectURL(url);

   

    showToast('CSV file downloaded successfully!', 'success');

  };



  const copySQL = (sql) => {

    navigator.clipboard.writeText(sql);

    showToast('SQL query copied to clipboard!', 'success');

  };



  const showToast = (message, type = 'info') => {

    const toast = document.createElement('div');

    toast.style.cssText = `

      position: fixed;

      top: 20px;

      right: 20px;

      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};

      color: white;

      padding: 12px 20px;

      border-radius: 8px;

      font-size: 14px;

      font-weight: 500;

      z-index: 10000;

      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

      transform: translateX(100%);

      transition: transform 0.3s ease;

    `;

    toast.textContent = message;

   

    document.body.appendChild(toast);

   

    setTimeout(() => {

      toast.style.transform = 'translateX(0)';

    }, 100);

   

    setTimeout(() => {

      toast.style.transform = 'translateX(100%)';

      setTimeout(() => {

        document.body.removeChild(toast);

      }, 300);

    }, 3000);

  };



  const exampleQueries = [

    "Show me the first 10 rows from the table",

    "Find all records where age is greater than 25",

    "Group by category and show the count of each",

    "Sort the data by date in descending order",

    "Join all tables and show me the combined results",

    "Find records that exist in table1 but not in table2",

    "Perform a LEFT JOIN between the first two tables",

    "Show me the intersection of all tables"

  ];



  const handleExampleClick = (example) => {

    setActiveQuery(example);

  };



  return (

    <div className="sql-compiler">

      <div className="compiler-header">

        <button onClick={onBackToDashboard} className="back-btn">

          ← Back to Dashboard

        </button>

                 <h1>Advanced SQL Compiler</h1>

         <p>Upload one or more tables and perform SQL operations with natural language</p>

      </div>



      <div className="compiler-content">

        {/* Table Upload Section */}

        <div className="upload-section">

          <h2>📊 Upload Tables</h2>

          <div className="upload-area">

            <input

              ref={fileInputRef}

              type="file"

              multiple

              accept=".csv,.json,.xlsx,.xls"

              onChange={handleFileUpload}

              style={{ display: 'none' }}

            />

            <button

              onClick={() => fileInputRef.current?.click()}

              className="upload-btn"

            >

              📁 Choose Multiple Files

            </button>

            <p>Support: CSV, JSON, Excel files</p>

          </div>

        </div>



        {/* Uploaded Tables Display */}

        {uploadedTables.length > 0 && (

          <div className="tables-section">

            <h3>📋 Uploaded Tables ({uploadedTables.length})</h3>

            <div className="tables-grid">

              {uploadedTables.map((table) => (

                <div key={table.id} className="table-card">

                  <div className="table-header">

                    <h4>{table.name}</h4>

                    <button

                      onClick={() => removeTable(table.id)}

                      className="remove-btn"

                    >

                      ✕

                    </button>

                  </div>

                 

                  <div className="table-info">

                    <button

                      onClick={() => setShowTableInfo(prev => ({

                        ...prev,

                        [table.id]: !prev[table.id]

                      }))}

                      className="info-btn"

                    >

                      {showTableInfo[table.id] ? 'Hide' : 'Show'} Info

                    </button>

                  </div>



                  {showTableInfo[table.id] && (

                    <div className="table-details">

                      {table.schema && (

                        <div className="schema-info">

                          <strong>Schema:</strong>

                          <div className="schema-grid">

                            {table.schema.columns.map((col, idx) => (

                              <div key={idx} className="column-info">

                                <span className="col-name">{col.name}</span>

                                <span className="col-type">{col.dtype}</span>

                              </div>

                            ))}

                          </div>

                        </div>

                      )}

                     

                      {table.preview && (

                        <div className="preview-info">

                          <strong>Preview (5 rows):</strong>

                          <div className="preview-table">

                            <table>

                              <thead>

                                <tr>

                                  {Object.keys(table.preview[0] || {}).map(key => (

                                    <th key={key}>{key}</th>

                                  ))}

                                </tr>

                              </thead>

                              <tbody>

                                {table.preview.slice(0, 5).map((row, idx) => (

                                  <tr key={idx}>

                                    {Object.values(row).map((val, valIdx) => (

                                      <td key={valIdx}>{String(val)}</td>

                                    ))}

                                  </tr>

                                ))}

                              </tbody>

                            </table>

                          </div>

                        </div>

                      )}

                    </div>

                  )}

                </div>

              ))}

            </div>

          </div>

        )}



        {/* Query Input Section */}

        <div className="query-section">

          <h2>🔍 Natural Language Query</h2>

          <div className="query-input-area">

            <textarea

              value={activeQuery}

              onChange={(e) => setActiveQuery(e.target.value)}

              placeholder="Describe what you want to do with the data in plain English... (e.g., 'Join all tables and show me the combined results')"

              className="query-textarea"

              rows={4}

            />

           

            <div className="query-actions">

              <button

                onClick={executeQuery}

                disabled={!activeQuery.trim() || uploadedTables.length === 0 || isLoading}

                className="execute-btn"

              >

                {isLoading ? '🔄 Executing...' : '🚀 Execute Query'}

              </button>

             

              <button

                onClick={() => setActiveQuery('')}

                className="clear-btn"

              >

                Clear

              </button>

            </div>

          </div>



          {/* Example Queries */}

          <div className="examples-section">

            <h4>💡 Example Queries:</h4>

            <div className="examples-grid">

              {exampleQueries.map((example, idx) => (

                <button

                  key={idx}

                  onClick={() => handleExampleClick(example)}

                  className="example-btn"

                >

                  {example}

                </button>

              ))}

            </div>

          </div>

        </div>



        {/* Results Section */}
        {queryResults && (
          <div className="results-section">
            <h2>📊 Query Results</h2>
            
            {queryResults.error ? (
              <div className="error-message">
                ❌ Error: {queryResults.error}
              </div>
            ) : (
              <>
                {/* Generated SQL */}
                <div className="sql-display">
                  <div className="sql-header">
                    <strong>Generated SQL:</strong>
                    <button
                      onClick={() => copySQL(queryResults.sql)}
                      className="copy-btn"
                    >
                      📋 Copy SQL
                    </button>
                  </div>
                  <pre className="sql-code">{queryResults.sql}</pre>
                </div>

                {/* Results Table */}
                <div className="results-display">
                  <div className="results-header">
                    <strong>Results ({queryResults.rows.length} rows):</strong>
                    <div className="results-actions">
                      <button
                        onClick={() => setShowVisualization(!showVisualization)}
                        className="visualization-toggle-btn"
                      >
                        {showVisualization ? '📊 Hide Charts' : '📊 Show Charts'}
                      </button>
                      <button
                        onClick={exportResults}
                        className="export-btn"
                      >
                        📥 Export CSV
                      </button>
                    </div>
                  </div>
                  
                  <div className="results-table-container">
                    <table className="results-table">
                      <thead>
                        <tr>
                          {queryResults.columns.map((column, index) => (
                            <th key={index}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>{String(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Data Visualization */}
                {showVisualization && (
                  <DataVisualization 
                    data={queryResults.results}
                    columns={queryResults.columns}
                    rows={queryResults.rows}
                    isFromSQL={true}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

    </div>

  );

};



export default SQLCompiler;