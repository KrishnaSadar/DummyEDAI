import React, { useState, useRef, useEffect } from 'react';
import ChartDisplay from './ChartDisplay'; // Import the new component

const Chat = ({ messages, onSendMessage, activeChat, selectedProject }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const chatContainerRef = useRef(null);

  // Smart suggestions state
  const FALLBACK_SUGGESTIONS = [
    "Show me sales trends over the last 6 months",
    "Compare revenue by product category",
    "Find any unusual patterns in the data",
    "Predict next month's sales forecast",
    "Segment customers by behavior",
    "What's the correlation between price and sales?",
    "Show me the top 10 performing products",
    "Identify seasonal patterns in the data",
    "Visualize monthly sales as a bar chart", // New suggestion
    "Show me a line graph of revenue over time" // New suggestion
  ];

  const [smartSuggestions, setSmartSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const lastFetchedProjectRef = useRef(null); // track which project we fetched for
  const suggestionsAbortRef = useRef(null); // AbortController for suggestions fetch

  useEffect(() => {
    // Auto-scroll when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Helper: detect common project id fields
  const resolveProjectId = (proj) => {
    if (!proj) return null;
    return proj.id || proj.projectId || proj.project_id || proj.uuid || null;
  };

  // Fetch suggestions on demand when panel opens (or when project changed)
  const fetchSuggestions = async (force = false) => {
    const projectId = resolveProjectId(selectedProject);

    if (!projectId) {
      setSuggestionsError('No project selected.');
      setSmartSuggestions(FALLBACK_SUGGESTIONS);
      return;
    }

    // If we've already fetched for this project and not forced, skip
    if (!force && lastFetchedProjectRef.current === projectId && smartSuggestions !== FALLBACK_SUGGESTIONS) {
      return;
    }

    // Abort previous pending fetch (if any)
    if (suggestionsAbortRef.current) {
      suggestionsAbortRef.current.abort();
    }
    const controller = new AbortController();
    suggestionsAbortRef.current = controller;
    console.log(projectId)
    const url = `http://localhost:5000/api/projects/get_suggestion/${projectId}`;
    console.log('[Chat] fetching suggestions from:', url);

    setSuggestionsLoading(true);
    setSuggestionsError(null);

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Server responded ${res.status}: ${text}`);
      }
      const data = await res.json();
      // try different possible property names
      const arr = data?.Suggested_Questions || data?.SuggestedQuestions || data?.suggested_questions || data?.suggestions || null;

      if (Array.isArray(arr) && arr.length > 0) {
        setSmartSuggestions(arr);
        lastFetchedProjectRef.current = projectId;
        setSuggestionsError(null);
      } else {
        // if API returned empty result, fallback
        setSmartSuggestions(FALLBACK_SUGGESTIONS);
        setSuggestionsError('Server returned no suggestions — using defaults.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Chat] suggestions fetch aborted');
        return;
      }
      console.error('[Chat] failed to fetch suggestions:', err);
      // Give more actionable message to user
      setSuggestionsError('Could not load suggestions — check server/CORS/project id. Using defaults.');
      setSmartSuggestions(FALLBACK_SUGGESTIONS);
    } finally {
      setSuggestionsLoading(false);
      // clear controller only if it's our active one
      if (suggestionsAbortRef.current === controller) suggestionsAbortRef.current = null;
    }
  };

  // Toggle suggestions panel and fetch on open
  const toggleSuggestions = () => {
    const willOpen = !showSuggestions;
    setShowSuggestions(willOpen);
    if (willOpen) {
      fetchSuggestions();
    }
  };

  // Allow manual retry
  const retryFetchSuggestions = () => {
    fetchSuggestions(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // If parent's onSendMessage returns a promise this will await it — otherwise it's fine.
      await onSendMessage(inputMessage);
    } catch (err) {
      console.error('onSendMessage error:', err);
    } finally {
      setInputMessage('');
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnalysisTypeIcon = (type) => {
    switch (type) {
      case 'trend': return '📈';
      case 'comparison': return '⚖️';
      case 'prediction': return '🔮';
      case 'anomaly': return '🔍';
      case 'segmentation': return '🎯';
      case 'correlation': return '🔗';
      case 'visualization': return '📊'; // New icon for visualization
      default: return '💡';
    }
  };

  const getAnalysisTypeColor = (type) => {
    switch (type) {
      case 'trend': return '#22c55e';
      case 'comparison': return '#3b82f6';
      case 'prediction': return '#8b5cf6';
      case 'anomaly': return '#ef4444';
      case 'segmentation': return '#f59e0b';
      case 'correlation': return '#06b6d4';
      case 'visualization': return '#a855f7'; // New color
      default: return '#6b7280';
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    setShowSuggestions(false);
  };

  const exportResults = (message) => {
    if (message.results) {
      const csvContent = [
        message.results.columns.join(','),
        ...message.results.rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_results_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const copySQL = async (sqlQuery) => {
    if (!sqlQuery) return;
    try {
      await navigator.clipboard.writeText(sqlQuery);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (suggestionsAbortRef.current) suggestionsAbortRef.current.abort();
    };
  }, []);

  return (
    <div className="main-area">
      <div className="chat-header">
        <div>
          <h1 className="chat-title">
            {activeChat ? activeChat.name : 'AI Data Analyst'}
          </h1>
          <p className="chat-subtitle">
            {activeChat
              ? `Analyzing data for ${selectedProject?.name || 'project'}`
              : 'Select or create a chat to get started'
            }
          </p>
        </div>

        {activeChat && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {messages.length} messages
            </div>
            <button
              onClick={toggleSuggestions}
              style={{
                background: 'rgba(96, 165, 250, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                color: '#60a5fa',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {suggestionsLoading ? 'Loading...' : 'Smart Suggestions'}
            </button>
          </div>
        )}
      </div>

      <div className="chat-container" ref={chatContainerRef} style={{ position: 'relative' }}>
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-title">Welcome to {activeChat?.name || 'DataQuery AI'}</div>
            <p>I'm your AI data analyst. I can help you:</p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginTop: '24px',
              textAlign: 'left'
            }}>
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>📈</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>Trend Analysis</h4>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  Discover patterns over time
                </p>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>⚖️</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Comparisons</h4>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  Compare different segments
                </p>
              </div>

              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔮</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>Predictions</h4>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  Forecast future trends
                </p>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>🔍</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Anomaly Detection</h4>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  Find unusual patterns
                </p>
              </div>
              
              {/* New Visualization box */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>📊</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#a855f7' }}>Data Visualization</h4>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                  Create charts and graphs
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.type}`}>
              <div className={`message-avatar ${message.type}`}>
                {message.type === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-content">
                {message.analysisType && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '6px 12px',
                    background: `${getAnalysisTypeColor(message.analysisType)}20`,
                    borderRadius: '20px',
                    border: `1px solid ${getAnalysisTypeColor(message.analysisType)}40`,
                    width: 'fit-content'
                  }}>
                    <span>{getAnalysisTypeIcon(message.analysisType)}</span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: getAnalysisTypeColor(message.analysisType),
                      textTransform: 'capitalize'
                    }}>
                      {message.analysisType} Analysis
                    </span>
                  </div>
                )}

                <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{message.message}</div>

                {message.sqlQuery && (
                  <div className="sql-query">
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <strong>Generated SQL:</strong>
                      <button
                        onClick={() => copySQL(message.sqlQuery)}
                        style={{
                          background: 'rgba(96, 165, 250, 0.2)',
                          border: '1px solid rgba(96, 165, 250, 0.3)',
                          color: '#60a5fa',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Copy SQL
                      </button>
                    </div>
                    <pre style={{ overflowX: 'auto' }}>{message.sqlQuery}</pre>
                  </div>
                )}

                {message.results && (
                  <div className="query-results">
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <strong>Results ({message.results.rows.length} rows):</strong>
                      <button
                        onClick={() => exportResults(message)}
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          color: '#22c55e',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Export CSV
                      </button>
                    </div>
                    <table className="results-table">
                      <thead>
                        <tr>
                          {message.results.columns.map((column, index) => (
                            <th key={index}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.results.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* New: Visualization display */}
                {message.chartConfig && (
                  <ChartDisplay chartConfig={message.chartConfig} />
                )}

                {message.insights && (
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '8px'
                  }}>
                    <strong style={{ color: '#a855f7' }}>Key Insights:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                      {message.insights.map((insight, index) => (
                        <li key={index} style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '13px',
                          marginBottom: '4px'
                        }}>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: '8px'
                }}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="chat-message system">
            <div className="message-avatar system">AI</div>
            <div className="message-content">
              <div className="message-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(96, 165, 250, 0.3)',
                    borderTop: '2px solid #60a5fa',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Analyzing your query and generating insights...
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuggestions && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '24px',
            right: '24px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(20px)',
            zIndex: 1000
          }}>
            <div style={{ marginBottom: '12px', fontWeight: '600', color: '#60a5fa' }}>
              Smart Suggestions:
            </div>

            {suggestionsLoading ? (
              <div style={{ padding: '12px 0', color: 'rgba(255,255,255,0.75)' }}>Loading suggestions…</div>
            ) : suggestionsError ? (
              <div style={{ padding: '12px 0', color: '#f87171' }}>
                {suggestionsError}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={retryFetchSuggestions}
                    style={{
                      background: 'rgba(96,165,250,0.15)',
                      border: '1px solid rgba(96,165,250,0.25)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: '#60a5fa',
                      fontSize: 13
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '8px'
              }}>
                {smartSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(96, 165, 250, 0.1)';
                      e.target.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="input-container">
        <form className="input-area" onSubmit={handleSubmit}>
          <textarea
            className="message-input"
            placeholder={activeChat
              ? "Ask a question about your data or write a SQL query..."
              : "Create a new chat to start analyzing your data..."
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading || !activeChat}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || isLoading || !activeChat}
          >
            {isLoading ? 'Analyzing...' : 'Send'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Chat;