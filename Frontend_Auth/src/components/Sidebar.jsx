import React, { useState } from 'react';

const Sidebar = ({ 
  onLogout, 
  onBackToProjects,
  selectedProject,
  history, 
  uploadedFile, 
  onFileUpload,
  onHistoryClick,
  chats,
  activeChat,
  onNewChat,
  onSwitchChat,
  onRenameChat,
  onDeleteChat,
  onOpenSQLCompiler
}) => {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleFileChange = (e) => {
    console.log('File change event triggered:', e.target.files); // Debug log
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size); // Debug log
      onFileUpload(file); // Pass the actual File object, not just the name
    } else {
      console.log('No file selected'); // Debug log
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const startRenaming = (chat) => {
    setEditingChatId(chat.id);
    setEditingName(chat.name);
  };

  const handleRename = (chatId) => {
    if (editingName.trim()) {
      onRenameChat(chatId, editingName.trim());
    }
    setEditingChatId(null);
    setEditingName('');
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setEditingName('');
  };

  const getChatTypeIcon = (chat) => {
    switch (chat.type) {
      case 'analysis': return '📊';
      case 'visualization': return '📈';
      case 'prediction': return '🔮';
      default: return '💬';
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">DataQuery AI</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="back-button"
            onClick={onBackToProjects}
            style={{
              background: 'rgba(96, 165, 250, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              color: '#60a5fa',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(96, 165, 250, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(96, 165, 250, 0.2)';
            }}
          >
            ← Projects
          </button>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="sidebar-section">
        <h3 className="section-title">Current Project</h3>
        <div style={{
          background: 'rgba(96, 165, 250, 0.1)',
          border: '1px solid rgba(96, 165, 250, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '8px'
        }}>
          <div style={{ 
            color: '#60a5fa', 
            fontSize: '14px', 
            fontWeight: '600',
            marginBottom: '4px'
          }}>
            {selectedProject.name}
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '12px' 
          }}>
            {selectedProject.description}
          </div>
        </div>
      </div>

      {/* Chat Management */}
      <div className="sidebar-section">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 className="section-title">Chats</h3>
          <button
            onClick={onNewChat}
            style={{
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(34, 197, 94, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(34, 197, 94, 0.2)';
            }}
          >
            + New
          </button>
        </div>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {chats.map((chat) => (
            <div 
              key={chat.id}
              style={{
                background: activeChat?.id === chat.id 
                  ? 'rgba(96, 165, 250, 0.2)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeChat?.id === chat.id 
                  ? 'rgba(96, 165, 250, 0.4)' 
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                group: true
              }}
              onClick={() => onSwitchChat(chat)}
              onMouseEnter={(e) => {
                if (activeChat?.id !== chat.id) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeChat?.id !== chat.id) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '12px' }}>{getChatTypeIcon(chat)}</span>
                  {editingChatId === chat.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(chat.id)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleRename(chat.id);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '13px',
                        padding: '2px 6px',
                        width: '100%',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  ) : (
                    <span style={{
                      color: activeChat?.id === chat.id ? '#60a5fa' : 'white',
                      fontSize: '13px',
                      fontWeight: '500',
                      flex: 1
                    }}>
                      {chat.name}
                    </span>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease'
                }} 
                className="chat-actions"
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(chat);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      padding: '2px',
                      fontSize: '12px',
                      borderRadius: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#60a5fa';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgba(255, 255, 255, 0.5)';
                    }}
                  >
                    ✏
                  </button>
                  {chats.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        padding: '2px',
                        fontSize: '12px',
                        borderRadius: '2px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = 'rgba(255, 255, 255, 0.5)';
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '11px' 
                }}>
                  {chat.messageCount} messages
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  fontSize: '10px' 
                }}>
                  {formatDate(chat.createdAt)}
                </div>
              </div>
              
              {chat.lastMessage && (
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '11px',
                  marginTop: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {chat.lastMessage.length > 30 
                    ? `${chat.lastMessage.substring(0, 30)}...` 
                    : chat.lastMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

             {/* Advanced SQL Compiler */}
       <div className="sidebar-section">
         <h3 className="section-title">Advanced SQL Compiler</h3>
         <div style={{
           background: 'rgba(139, 92, 246, 0.1)',
           border: '1px solid rgba(139, 92, 246, 0.2)',
           borderRadius: '8px',
           padding: '16px',
           marginBottom: '16px'
         }}>
           <div style={{ 
             color: '#a855f7', 
             fontSize: '14px', 
             fontWeight: '600',
             marginBottom: '8px'
           }}>
             Multi-Table SQL Operations
           </div>
           <div style={{ 
             color: 'rgba(255, 255, 255, 0.6)', 
             fontSize: '12px',
             marginBottom: '12px'
           }}>
             Upload multiple tables and perform JOINs, UNIONs, and complex queries
           </div>
           <button
             onClick={onOpenSQLCompiler}
             style={{
               background: 'rgba(139, 92, 246, 0.2)',
               border: '1px solid rgba(139, 92, 246, 0.3)',
               color: '#a855f7',
               padding: '8px 16px',
               borderRadius: '6px',
               fontSize: '12px',
               cursor: 'pointer',
               transition: 'all 0.3s ease',
               width: '100%'
             }}
             onMouseEnter={(e) => {
               e.target.style.background = 'rgba(139, 92, 246, 0.3)';
             }}
             onMouseLeave={(e) => {
               e.target.style.background = 'rgba(139, 92, 246, 0.2)';
             }}
           >
             🗄 Open SQL Compiler
           </button>
         </div>
       </div>

       {/* File Upload */}
       <div className="sidebar-section">
         <h3 className="section-title">Upload Dataset</h3>
         <div className="upload-area" style={{ position: 'relative' }}>
           <input
             type="file"
             id="file-upload"
             accept=".csv,.json,.xlsx,.xls"
             onChange={handleFileChange}
             style={{
               display: 'block',
               marginBottom: '10px',
               padding: '10px',
               border: '1px solid #ccc',
               borderRadius: '4px',
               width: '100%'
             }}
           />
           <div style={{
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'center',
             padding: '20px',
             border: '2px dashed rgba(96, 165, 250, 0.3)',
             borderRadius: '8px',
             minHeight: '100px',
             background: 'rgba(96, 165, 250, 0.05)'
           }}>
             <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '8px' }}>
               {uploadedFile ? 'Change Dataset' : 'File Upload Area'}
             </div>
             <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
               CSV, JSON, Excel files supported
             </div>
           </div>
         </div>
         
         {uploadedFile && (
           <div className="uploaded-file">
             <div className="file-icon"></div>
             <span className="file-name">{uploadedFile.name}</span>
           </div>
         )}
       </div>

      {/* Query History */}
      <div className="sidebar-section">
        <h3 className="section-title">Recent Queries</h3>
        {history.length === 0 ? (
          <div className="history-empty">No queries yet</div>
        ) : (
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {history.slice().reverse().slice(0, 10).map((item) => (
              <div 
                key={item.id} 
                className="history-item"
                onClick={() => onHistoryClick(item)}
              >
                <div className="history-query">
                  {item.query.length > 40 
                    ?` ${item.query.substring(0, 40)}...`
                    : item.query
                  }
                </div>
                <div className="history-time">
                  {formatTime(item.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar-section:hover .chat-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;