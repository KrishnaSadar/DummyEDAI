import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Chat from './Chat';

const Dashboard = ({ onLogout, selectedProject, onBackToProjects, onOpenSQLCompiler }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(selectedProject?.file_location || '');

  // Chat Management
  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      name: `Chat ${chats.length + 1}`,
      createdAt: new Date(),
      lastMessage: null,
      messageCount: 0,
      type: 'general'
    };
    
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat);
    setMessages([]);
    
    const welcomeMessage = {
      id: Date.now().toString(),
      type: 'system',
      message: `Welcome to ${newChat.name}! I'm ready to help you analyze your data. You can ask questions in natural language or request specific SQL queries.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const switchChat = (chat) => {
    setActiveChat(chat);
    const welcomeMessage = {
      id: Date.now().toString(),
      type: 'system',
      message: `Switched to ${chat.name}. Previous conversation history would be loaded here.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const renameChat = (chatId, newName) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, name: newName } : chat
    ));
  };

  const deleteChat = (chatId) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChat?.id === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        switchChat(remainingChats[0]);
      } else {
        setActiveChat(null);
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async (message) => {
    if (!activeChat) {
      createNewChat();
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setChats(prev => prev.map(chat =>
      chat.id === activeChat.id
        ? { ...chat, lastMessage: message, messageCount: chat.messageCount + 1, lastActivity: new Date() }
        : chat
    ));

    const historyItem = {
      id: Date.now().toString(),
      query: message,
      timestamp: new Date(),
      chatId: activeChat.id
    };
    setHistory(prev => [...prev, historyItem]);

    setMessages(prev => [...prev, {
      id: 'loading',
      type: 'system',
      message: 'Analyzing your query and generating insights...',
      timestamp: new Date(),
      isLoading: true,
    }]);

    const projectId = selectedProject.id;
    let llmResponse = null;

    try {
      const response = await fetch(`http://localhost:5000/api/projects/insight/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
      });

      if (!response.ok) {
        throw new Error('LLM API call failed');
      }

      const data = await response.json();
      console.log(data);
      llmResponse = data;

    } catch (error) {
      console.error('Error with LLM API:', error);
      
      const analysisType = detectQueryType(message);
      
      // Fallback to mock data if API fails
      llmResponse = {
        Generate_SQL: generateSQLQuery(message, analysisType),
        Result_in_csv: generateMockCsv(message, analysisType),
        Key_insight: generateInsights(message, analysisType).join("\n"),
        chartConfig: generateChartData(message, analysisType) // Mock chart data
      };
    }
    
    // --- Parse the CSV data and split the insights string ---
    const parsedCsvData = parseCsvString(llmResponse.Result_in_csv);
    const insightsArray = llmResponse.Key_insight ? llmResponse.Key_insight.split('\n') : [];

    // Remove the loading message
    setMessages(prev => prev.filter(msg => msg.id !== 'loading'));

    // Display the final AI response
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      message: "Here are the results of your query:", // You can customize this message
      sqlQuery: llmResponse.Generate_SQL,
      results: {
        columns: parsedCsvData.columns,
        rows: parsedCsvData.rows,
      },
      insights: insightsArray,
      analysisType: detectQueryType(message),
      chartConfig: llmResponse.chartConfig, // Pass the chart config to the message object
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  // Helper function to parse CSV string to a structured object
  const parseCsvString = (csvString) => {
    if (!csvString) return { columns: [], rows: [] };
    
    const [headerLine, ...dataLines] = csvString.trim().split('\n');
    const columns = headerLine.split(',');
    const rows = dataLines.map(line => line.split(','));
    
    return { columns, rows };
  };

  const detectQueryType = (query) => {
    const q = query.toLowerCase();
    if (q.includes('visualize') || q.includes('chart') || q.includes('graph') || q.includes('plot')) return 'visualization';
    if (q.includes('trend') || q.includes('over time') || q.includes('monthly') || q.includes('yearly')) return 'trend';
    if (q.includes('compare') || q.includes('vs') || q.includes('difference')) return 'comparison';
    if (q.includes('predict') || q.includes('forecast') || q.includes('future')) return 'prediction';
    if (q.includes('anomaly') || q.includes('outlier') || q.includes('unusual')) return 'anomaly';
    if (q.includes('cluster') || q.includes('segment') || q.includes('group')) return 'segmentation';
    if (q.includes('correlation') || q.includes('relationship') || q.includes('impact')) return 'correlation';
    return 'general';
  };

  const generateSQLQuery = (userQuery, analysisType) => {
    const query = userQuery.toLowerCase();
    const tableName = selectedProject?.file_location.split('/')[1]?.split('.')[0] || 'data';
    
    switch (analysisType) {
      case 'trend':
      case 'visualization':
        if (query.includes('sales') || query.includes('revenue')) {
          return `SELECT
            DATE_FORMAT(date, '%Y-%m') as month,
            SUM(amount) as revenue
          FROM sales
          GROUP BY month
          ORDER BY month;`;
        }
        return `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM ${tableName} GROUP BY month ORDER BY month;`;
      
      case 'comparison':
        return `SELECT
          category,
          COUNT(*) as total_count,
          AVG(value) as avg_value,
          SUM(value) as total_value
        FROM ${tableName}
        GROUP BY category
        ORDER BY total_value DESC;`;
      
      case 'prediction':
        return `SELECT
          DATE_FORMAT(date, '%Y-%m') as month,
          SUM(amount) as actual_revenue,
          LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m')) as prev_month,
          (SUM(amount) - LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m'))) / LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m')) * 100 as growth_rate
        FROM sales
        GROUP BY month
        ORDER BY month;`;
      
      default:
        if (query.includes('user') || query.includes('customer')) {
          if (query.includes('count') || query.includes('total')) {
            return `SELECT COUNT(*) as total_users FROM users;`;
          }
          return `SELECT * FROM users WHERE status = "active" LIMIT 10;`;
        }
        return `SELECT * FROM ${tableName} LIMIT 10;`;
    }
  };

  const generateMockCsv = (userQuery, analysisType) => {
    const q = userQuery.toLowerCase();
    switch (analysisType) {
      case 'trend':
      case 'visualization':
        return "month,revenue,transactions,avg_transaction\n2024-01,$45230,324,$139.66\n2024-02,$52180,385,$135.53\n2024-03,$48920,356,$137.42\n2024-04,$56780,412,$137.86\n2024-05,$61450,445,$138.20";
      case 'comparison':
        return "category,total_count,avg_value,total_value\nPremium,145,$299.50,$43427.50\nStandard,328,$149.99,$49196.72\nBasic,892,$49.99,$44591.08\nEnterprise,23,$999.99,$22999.77";
      case 'prediction':
        return "month,actual_revenue,predicted_next,confidence\n2024-05,$61450,$64200,87%\n2024-06,N/A,$66800,82%\n2024-07,N/A,$69500,78%";
      default:
        return "id,name,email,status\n1,John Doe,john@example.com,active\n2,Jane Smith,jane@example.com,active\n3,Bob Johnson,bob@example.com,inactive";
    }
  };

  const generateInsights = (userQuery, analysisType) => {
    switch (analysisType) {
      case 'trend':
      case 'visualization':
        return [
          "Revenue shows steady 8.2% monthly growth",
          "Transaction volume increased by 12% in last quarter",
          "Average transaction value remains stable around $137"
        ];
      case 'comparison':
        return [
          "Basic tier has highest volume (892 transactions)",
          "Premium tier shows highest average value per transaction",
          "Enterprise segment has potential for growth (only 23 customers)"
        ];
      case 'prediction':
        return [
          "Predicted 4.5% growth for next month",
          "Seasonal patterns suggest Q3 acceleration",
          "Confidence decreases for longer forecasts"
        ];
      default:
        return ["3 active users found", "1 inactive user requires attention"];
    }
  };

  const generateChartData = (userQuery, analysisType) => {
    const q = userQuery.toLowerCase();
    if (analysisType !== 'visualization') return null;

    const labels = ["Jan", "Feb", "Mar", "Apr", "May"];
    const data = [45230, 52180, 48920, 56780, 61450];
    const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4'];

    if (q.includes('line')) {
      return {
        type: 'line',
        title: 'Monthly Revenue Trend (Line Chart)',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenue',
            data: data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: 'rgba(255,255,255,0.8)' }
            },
            x: {
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: 'rgba(255,255,255,0.8)' }
            }
          }
        }
      };
    } else { // Default to bar chart for other visualization requests
      return {
        type: 'bar',
        title: 'Monthly Revenue Distribution (Bar Chart)',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenue',
            data: data,
            backgroundColor: '#a855f7',
            borderColor: '#8b5cf6',
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: 'rgba(255,255,255,0.8)' }
            },
            x: {
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: 'rgba(255,255,255,0.8)' }
            }
          }
        }
      };
    }
  };

  const handleFileUpload = (fileName) => {
    setUploadedFile(fileName);
  };

  const handleHistoryClick = (historyItem) => {
    // Switch to the chat where this query was made
    const chat = chats.find(c => c.id === historyItem.chatId);
    if (chat) {
      switchChat(chat);
    }
    handleSendMessage(historyItem.query);
  };

  // Auto-create first chat if none exists
  React.useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  return (
    <div className="dashboard">
      <Sidebar
        onLogout={onLogout}
        onBackToProjects={onBackToProjects}
        selectedProject={selectedProject}
        history={history}
        uploadedFile={uploadedFile}
        onFileUpload={handleFileUpload}
        onHistoryClick={handleHistoryClick}
        chats={chats}
        activeChat={activeChat}
        onNewChat={createNewChat}
        onSwitchChat={switchChat}
        onRenameChat={renameChat}
        onDeleteChat={deleteChat}
        onOpenSQLCompiler={onOpenSQLCompiler}
      />
      <Chat
        messages={messages}
        onSendMessage={handleSendMessage}
        activeChat={activeChat}
        selectedProject={selectedProject}
      />
    </div>
  );
};

export default Dashboard;

// import React, { useState, useEffect } from 'react';
// import Sidebar from './Sidebar';
// import Chat from './Chat';

// const Dashboard = ({ onLogout, selectedProject, onBackToProjects, onOpenSQLCompiler }) => {
//   const [chats, setChats] = useState([]);
//   const [activeChat, setActiveChat] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [history, setHistory] = useState([]);
//   const [uploadedFile, setUploadedFile] = useState(selectedProject?.file_location || '');

//   // Chat Management
//   const createNewChat = () => {
//     const newChat = {
//       id: Date.now().toString(),
//       name: `Chat ${chats.length + 1}`,
//       createdAt: new Date(),
//       lastMessage: null,
//       messageCount: 0,
//       type: 'general'
//     };
    
//     setChats(prev => [newChat, ...prev]);
//     setActiveChat(newChat);
//     setMessages([]);
    
//     const welcomeMessage = {
//       id: Date.now().toString(),
//       type: 'system',
//       message: `Welcome to ${newChat.name}! I'm ready to help you analyze your data. You can ask questions in natural language or request specific SQL queries.`,
//       timestamp: new Date(),
//     };
//     setMessages([welcomeMessage]);
//   };

//   const switchChat = (chat) => {
//     setActiveChat(chat);
//     const welcomeMessage = {
//       id: Date.now().toString(),
//       type: 'system',
//       message: `Switched to ${chat.name}. Previous conversation history would be loaded here.`,
//       timestamp: new Date(),
//     };
//     setMessages([welcomeMessage]);
//   };

//   const renameChat = (chatId, newName) => {
//     setChats(prev => prev.map(chat =>
//       chat.id === chatId ? { ...chat, name: newName } : chat
//     ));
//   };

//   const deleteChat = (chatId) => {
//     setChats(prev => prev.filter(chat => chat.id !== chatId));
//     if (activeChat?.id === chatId) {
//       const remainingChats = chats.filter(chat => chat.id !== chatId);
//       if (remainingChats.length > 0) {
//         switchChat(remainingChats[0]);
//       } else {
//         setActiveChat(null);
//         setMessages([]);
//       }
//     }
//   };

//   const handleSendMessage = async (message) => {
//     if (!activeChat) {
//       createNewChat();
//       return;
//     }

//     const userMessage = {
//       id: Date.now().toString(),
//       type: 'user',
//       message,
//       timestamp: new Date(),
//     };
//     setMessages(prev => [...prev, userMessage]);

//     setChats(prev => prev.map(chat =>
//       chat.id === activeChat.id
//         ? { ...chat, lastMessage: message, messageCount: chat.messageCount + 1, lastActivity: new Date() }
//         : chat
//     ));

//     const historyItem = {
//       id: Date.now().toString(),
//       query: message,
//       timestamp: new Date(),
//       chatId: activeChat.id
//     };
//     setHistory(prev => [...prev, historyItem]);

//     setMessages(prev => [...prev, {
//       id: 'loading',
//       type: 'system',
//       message: 'Analyzing your query and generating insights...',
//       timestamp: new Date(),
//       isLoading: true,
//     }]);

//     const projectId = selectedProject.id;
//     let llmResponse = null;

//     try {
//       const response = await fetch(`http://localhost:5000/api/projects/insight/${projectId}`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ prompt: message }),
//       });

//       if (!response.ok) {
//         throw new Error('LLM API call failed');
//       }

//       const data = await response.json();
//       console.log(data);
//       // Assuming 'data' contains the JSON object from the LLM
//       llmResponse = data;

//     } catch (error) {
//       console.error('Error with LLM API:', error);
      
//       // Fallback to mock data if API fails
//       llmResponse = {
//         Generate_SQL: "SELECT * FROM 'customer_data' LIMIT 5;",
//         Result_in_csv: "Timestamp,age,Gender,Purchase_Frequency,Purchase_Categories\n2023/06/04 1:28:19 PM GMT+5:30,23,Female,Few times a month,Beauty and Personal Care\n2023/06/04 2:30:44 PM GMT+5:30,23,Female,Once a month,Clothing and Fashion\n2023/06/04 5:04:56 PM GMT+5:30,24,Prefer not to say,Few times a month,Groceries and Gourmet Food;Clothing and Fashion",
//         Key_insight: "The initial entries show a diverse range of ages and purchasing habits across different product categories."
//       };
//     }
    
//     // --- Parse the CSV data and split the insights string ---
//     const parsedCsvData = parseCsvString(llmResponse.Result_in_csv);
//     const insightsArray = llmResponse.Key_insight ? [llmResponse.Key_insight] : [];

//     // Remove the loading message
//     setMessages(prev => prev.filter(msg => msg.id !== 'loading'));

//     // Display the final AI response
//     const aiMessage = {
//       id: (Date.now() + 1).toString(),
//       type: 'system',
//       message: "Here are the results of your query:", // You can customize this message
//       sqlQuery: llmResponse.Generate_SQL,
//       results: {
//         columns: parsedCsvData.columns,
//         rows: parsedCsvData.rows,
//       },
//       insights: insightsArray,
//       analysisType: detectQueryType(message),
//       timestamp: new Date(),
//     };
//     setMessages(prev => [...prev, aiMessage]);
//   };

//   // Helper function to parse CSV string to a structured object
//   const parseCsvString = (csvString) => {
//     if (!csvString) return { columns: [], rows: [] };
    
//     const [headerLine, ...dataLines] = csvString.trim().split('\n');
//     const columns = headerLine.split(',');
//     const rows = dataLines.map(line => line.split(','));
    
//     return { columns, rows };
//   };


// //   import React, { useState } from 'react';
// //   import Sidebar from './Sidebar';
// //   import Chat from './Chat';

// //   const Dashboard = ({ onLogout, selectedProject, onBackToProjects }) => {
// //     const [chats, setChats] = useState([]);
// //     const [activeChat, setActiveChat] = useState(null);
// //     const [messages, setMessages] = useState([]);
// //     const [history, setHistory] = useState([]);
// //     const [uploadedFile, setUploadedFile] = useState(selectedProject?.file_location || '');

// //     // Chat Management
// //     const createNewChat = () => {
// //       const newChat = {
// //         id: Date.now().toString(),
// //         name: `Chat ${chats.length + 1}`,
// //         createdAt: new Date(),
// //         lastMessage: null,
// //         messageCount: 0,
// //         type: 'general' // general, analysis, visualization, etc.
// //       };
      
// //       setChats(prev => [newChat, ...prev]);
// //       setActiveChat(newChat);
// //       setMessages([]);
      
// //       // Add welcome message for new chat
// //       const welcomeMessage = {
// //         id: Date.now().toString(),
// //         type: 'system',
// //         message: `Welcome to ${newChat.name}! I'm ready to help you analyze your data. You can ask questions in natural language or request specific SQL queries.`,
// //         timestamp: new Date(),
// //       };
// //       setMessages([welcomeMessage]);
// //     };

// //     const switchChat = (chat) => {
// //       setActiveChat(chat);
// //       // In a real app, you'd load messages from storage/API
// //       // For demo, we'll start fresh but keep the chat structure
// //       const welcomeMessage = {
// //         id: Date.now().toString(),
// //         type: 'system',
// //         message: `Switched to ${chat.name}. Previous conversation history would be loaded here.`,
// //         timestamp: new Date(),
// //       };
// //       setMessages([welcomeMessage]);
// //     };

// //     const renameChat = (chatId, newName) => {
// //       setChats(prev => prev.map(chat =>
// //         chat.id === chatId ? { ...chat, name: newName } : chat
// //       ));
// //     };

// //     const deleteChat = (chatId) => {
// //       setChats(prev => prev.filter(chat => chat.id !== chatId));
// //       if (activeChat?.id === chatId) {
// //         const remainingChats = chats.filter(chat => chat.id !== chatId);
// //         if (remainingChats.length > 0) {
// //           switchChat(remainingChats[0]);
// //         } else {
// //           setActiveChat(null);
// //           setMessages([]);
// //         }
// //       }
// //     };

// //     // const handleSendMessage = (message) => {
// //     //   if (!activeChat) {
// //     //     // Auto-create chat if none exists
// //     //     createNewChat();
// //     //     return;
// //     //   }

// //     //   // Add user message
// //     //   const userMessage = {
// //     //     id: Date.now().toString(),
// //     //     type: 'user',
// //     //     message,
// //     //     timestamp: new Date(),
// //     //   };

// //     //   setMessages(prev => [...prev, userMessage]);

// //     //   // Update chat metadata
// //     //   setChats(prev => prev.map(chat =>
// //     //     chat.id === activeChat.id
// //     //       ? {
// //     //           ...chat,
// //     //           lastMessage: message,
// //     //           messageCount: chat.messageCount + 1,
// //     //           lastActivity: new Date()
// //     //         }
// //     //       : chat
// //     //   ));

// //     //   // Add to history
// //     //   const historyItem = {
// //     //     id: Date.now().toString(),
// //     //     query: message,
// //     //     timestamp: new Date(),
// //     //     chatId: activeChat.id
// //     //   };
// //     //   setHistory(prev => [...prev, historyItem]);

// //     //   // Enhanced AI response with multiple analysis types
// //     //   setTimeout(() => {
// //     //     const analysisType = detectQueryType(message);
// //     //     const sqlQuery = generateSQLQuery(message, analysisType);
// //     //     const mockResults = generateMockResults(message, analysisType);
// //     //     const insights = generateInsights(mockResults, analysisType);
        
// //     //     const systemMessage = {
// //     //       id: (Date.now() + 1).toString(),
// //     //       type: 'system',
// //     //       message: `I've analyzed your ${analysisType} request:`,
// //     //       sqlQuery,
// //     //       results: mockResults,
// //     //       insights,
// //     //       analysisType,
// //     //       timestamp: new Date(),
// //     //     };

// //     //     setMessages(prev => [...prev, systemMessage]);
// //     //   }, 1500);
// //     // };

// //     // Enhanced query type detection
    
// //     const handleSendMessage = async (message) => {
// //   if (!activeChat) {
// //     createNewChat();
// //     return;
// //   }

// //   const userMessage = {
// //     id: Date.now().toString(),
// //     type: 'user',
// //     message,
// //     timestamp: new Date(),
// //   };

// //   setMessages(prev => [...prev, userMessage]);

// //   // Update chat metadata
// //   setChats(prev => prev.map(chat =>
// //     chat.id === activeChat.id
// //       ? { ...chat, lastMessage: message, messageCount: chat.messageCount + 1, lastActivity: new Date() }
// //       : chat
// //   ));

// //   const historyItem = {
// //     id: Date.now().toString(),
// //     query: message,
// //     timestamp: new Date(),
// //     chatId: activeChat.id
// //   };
// //   setHistory(prev => [...prev, historyItem]);

// //   // Show a loading state while waiting for the AI response
// //   setMessages(prev => [...prev, {
// //     id: 'loading',
// //     type: 'system',
// //     message: 'Analyzing your query and generating insights...',
// //     timestamp: new Date(),
// //     isLoading: true,
// //   }]);

// //   // NEW: Send user's message to the backend with the project ID
// //   const projectId = selectedProject.id;

// //   try {
// //   const response = await fetch(`http://localhost:5000/api/projects/insight/${projectId}`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify({ prompt: message }),
// //     });
// //   if (!response.ok) {
// //     throw new Error('LLM API call failed');
// //   }

// //   const llmResponse = await response.json();
// //   // Assuming llmResponse is the JSON object with the html_content field
// //   console.log("LLM API success:", llmResponse);

// //   // Remove the loading message and add the AI's response
// //   setMessages(prev => prev.filter(msg => msg.id !== 'loading'));

// //   const aiMessage = {
// //     id: (Date.now() + 1).toString(),
// //     type: 'system',
// //     // Now you just use the HTML content directly
// //     message: llmResponse.html_content,
// //     // You'd also get other fields from the LLM
// //     sqlQuery: llmResponse.sql_query,
// //     analysisType: llmResponse.analysis_type,
// //     // The `results` and `insights` are now part of the HTML_content
// //     results: null,
// //     insights: null,
// //     timestamp: new Date(),
// //   };

// //   setMessages(prev => [...prev, aiMessage]);
// //   }
// //   // try {
// //   //   const response = await fetch(`http://localhost:5000/api/projects/insight/${projectId}`, {
// //   //     method: 'POST',
// //   //     headers: {
// //   //       'Content-Type': 'application/json',
// //   //     },
// //   //     body: JSON.stringify({ prompt: message }),
// //   //   });

// //   //   if (!response.ok) {
// //   //     throw new Error('LLM API call failed');
// //   //   }

// //   //   const llmResponse = await response.json();
// //   //   console.log(llmResponse); // Log the response from the backend

// //   //   const analysisType = llmResponse.analysisType || 'general';
// //   //   const sqlQuery = llmResponse.sqlQuery || 'SQL query not available.';
// //   //   const results = llmResponse.results || { columns: [], rows: [] };
// //   //   const insights = llmResponse.insights || ['No insights provided by the AI.'];

// //   //   // Remove the loading message and add the AI's response
// //   //   setMessages(prev => prev.filter(msg => msg.id !== 'loading'));

// //   //   const aiMessage = {
// //   //     id: (Date.now() + 1).toString(),
// //   //     type: 'system',
// //   //     message: llmResponse.message || `I've analyzed your ${analysisType} request:`,
// //   //     sqlQuery,
// //   //     results,
// //   //     insights,
// //   //     analysisType,
// //   //     timestamp: new Date(),
// //   //   };
// //   //   setMessages(prev => [...prev, aiMessage]);

// //   catch (error) {
// //     console.error('Error sending message to backend:', error);
// //     setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
// //     setMessages(prev => [...prev, {
// //       id: (Date.now() + 1).toString(),
// //       type: 'system',
// //       message: `Error: Could not get a response from the AI. (${error.message})`,
// //       timestamp: new Date(),
// //     }]);
// //   }
// // };

  
//     const detectQueryType = (query) => {
//       const q = query.toLowerCase();
//       if (q.includes('trend') || q.includes('over time') || q.includes('monthly') || q.includes('yearly')) return 'trend';
//       if (q.includes('compare') || q.includes('vs') || q.includes('difference')) return 'comparison';
//       if (q.includes('predict') || q.includes('forecast') || q.includes('future')) return 'prediction';
//       if (q.includes('anomaly') || q.includes('outlier') || q.includes('unusual')) return 'anomaly';
//       if (q.includes('cluster') || q.includes('segment') || q.includes('group')) return 'segmentation';
//       if (q.includes('correlation') || q.includes('relationship') || q.includes('impact')) return 'correlation';
//       return 'general';
//     };

//     const generateSQLQuery = (userQuery, analysisType) => {
//       const query = userQuery.toLowerCase();
//       const tableName = selectedProject?.file_location.split('/')[1]?.split('.')[0] || 'data';
      
//       switch (analysisType) {
//         case 'trend':
//           if (query.includes('sales') || query.includes('revenue')) {
//             return `SELECT
//       DATE_FORMAT(date, '%Y-%m') as month,
//       SUM(amount) as revenue,
//       COUNT(*) as transactions,
//       AVG(amount) as avg_transaction
//   FROM sales
//   WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
//   GROUP BY month
//   ORDER BY month;`;
//           }
//           return `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM ${tableName} GROUP BY month ORDER BY month;`;
        
//         case 'comparison':
//           return `SELECT
//       category,
//       COUNT(*) as total_count,
//       AVG(value) as avg_value,
//       SUM(value) as total_value
//   FROM ${tableName}
//   GROUP BY category
//   ORDER BY total_value DESC;`;
        
//         case 'prediction':
//           return `SELECT
//       DATE_FORMAT(date, '%Y-%m') as month,
//       SUM(amount) as actual_revenue,
//       LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m')) as prev_month,
//       (SUM(amount) - LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m'))) / LAG(SUM(amount), 1) OVER (ORDER BY DATE_FORMAT(date, '%Y-%m')) * 100 as growth_rate
//   FROM sales
//   GROUP BY month
//   ORDER BY month;`;
        
//         default:
//           if (query.includes('user') || query.includes('customer')) {
//             if (query.includes('count') || query.includes('total')) {
//               return `SELECT COUNT(*) as total_users FROM users;`;
//             }
//             return `SELECT * FROM users WHERE status = "active" LIMIT 10;`;
//           }
//           return `SELECT * FROM ${tableName} LIMIT 10;`;
//       }
//     };

//     const generateMockResults = (userQuery, analysisType) => {
//       switch (analysisType) {
//         case 'trend':
//           return {
//             columns: ['month', 'revenue', 'transactions', 'avg_transaction'],
//             rows: [
//               ['2024-01', '$45,230', '324', '$139.66'],
//               ['2024-02', '$52,180', '385', '$135.53'],
//               ['2024-03', '$48,920', '356', '$137.42'],
//               ['2024-04', '$56,780', '412', '$137.86'],
//               ['2024-05', '$61,450', '445', '$138.20']
//             ]
//           };
        
//         case 'comparison':
//           return {
//             columns: ['category', 'total_count', 'avg_value', 'total_value'],
//             rows: [
//               ['Premium', '145', '$299.50', '$43,427.50'],
//               ['Standard', '328', '$149.99', '$49,196.72'],
//               ['Basic', '892', '$49.99', '$44,591.08'],
//               ['Enterprise', '23', '$999.99', '$22,999.77']
//             ]
//           };
        
//         case 'prediction':
//           return {
//             columns: ['month', 'actual_revenue', 'predicted_next', 'confidence'],
//             rows: [
//               ['2024-05', '$61,450', '$64,200', '87%'],
//               ['2024-06', 'N/A', '$66,800', '82%'],
//               ['2024-07', 'N/A', '$69,500', '78%']
//             ]
//           };
        
//         default:
//           return {
//             columns: ['id', 'name', 'email', 'status'],
//             rows: [
//               [1, 'John Doe', 'john@example.com', 'active'],
//               [2, 'Jane Smith', 'jane@example.com', 'active'],
//               [3, 'Bob Johnson', 'bob@example.com', 'inactive']
//             ]
//           };
//       }
//     };

//     const generateInsights = (results, analysisType) => {
//       switch (analysisType) {
//         case 'trend':
//           return [
//             "Revenue shows steady 8.2% monthly growth",
//             "Transaction volume increased by 12% in last quarter",
//             "Average transaction value remains stable around $137"
//           ];
        
//         case 'comparison':
//           return [
//             "Basic tier has highest volume (892 transactions)",
//             "Premium tier shows highest average value per transaction",
//             "Enterprise segment has potential for growth (only 23 customers)"
//           ];
        
//         case 'prediction':
//           return [
//             "Predicted 4.5% growth for next month",
//             "Seasonal patterns suggest Q3 acceleration",
//             "Confidence decreases for longer forecasts"
//           ];
        
//         default:
//           return ["3 active users found", "1 inactive user requires attention"];
//       }
//     };

//     const handleFileUpload = (fileName) => {

      
//       setUploadedFile(fileName);
//     };

//     const handleHistoryClick = (historyItem) => {
//       // Switch to the chat where this query was made
//       const chat = chats.find(c => c.id === historyItem.chatId);
//       if (chat) {
//         switchChat(chat);
//       }
//       handleSendMessage(historyItem.query);
//     };

//     // Auto-create first chat if none exists
//     React.useEffect(() => {
//       if (chats.length === 0) {
//         createNewChat();
//       }
//     }, []);

//     return (
//       <div className="dashboard">
//         <Sidebar
//           onLogout={onLogout}
//           onBackToProjects={onBackToProjects}
//           selectedProject={selectedProject}
//           history={history}
//           uploadedFile={uploadedFile}
//           onFileUpload={handleFileUpload}
//           onHistoryClick={handleHistoryClick}
//           chats={chats}
//           activeChat={activeChat}
//           onNewChat={createNewChat}
//           onSwitchChat={switchChat}
//           onRenameChat={renameChat}
//           onDeleteChat={deleteChat}
//           onOpenSQLCompiler={onOpenSQLCompiler}
//         />
//         <Chat
//           messages={messages}
//           onSendMessage={handleSendMessage}
//           activeChat={activeChat}
//           selectedProject={selectedProject}
//         />
//       </div>
//     );
//   };

//   export default Dashboard;