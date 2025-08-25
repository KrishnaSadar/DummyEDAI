import React, { useState, useEffect, useRef } from 'react';

const ProjectSelection = ({ onProjectSelect, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectFile, setNewProjectFile] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // New fetch logic to get projects from the backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        const formattedProjects = data.map(project => ({
          ...project,
          lastAccessed: new Date(),
          status: 'active',
          datasetCount: Math.floor(Math.random() * 10) + 1, // Mocking these values as they're not in the API response
          queryCount: Math.floor(Math.random() * 200) + 50,
          tags: ['data-analysis', 'project']
        }));
        setProjects(formattedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]); // Fallback to an empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowMenu(false); // Close menu if a project card is clicked
  };

  const handleProjectSelect = () => {
    if (selectedProject) {
      onProjectSelect(selectedProject);
    }
  };

  const handleCreateNewProject = () => {
    setShowNewProjectModal(true);
  };

  const handleFileUpload = (e) => {
    setNewProjectFile(e.target.files[0]);
  };

  const saveNewProject = async () => {
    if (!newProjectName.trim() || !newProjectFile) {
      alert("Please provide a project name and upload a file.");
      return;
    }

    const formData = new FormData();
    formData.append('name', newProjectName.trim());
    formData.append('dataFile', newProjectFile);

    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Project creation failed.');
      }

      const newProject = await response.json();
      console.log('New project created:', newProject);

      setProjects(prevProjects => [newProject, ...prevProjects]);
      setSelectedProject(newProject);
      onProjectSelect(newProject);

      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectFile(null);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleMenuClick = (event, project) => {
    event.stopPropagation(); // Prevents the project card click from firing
    setSelectedProject(project);
    setMenuPosition({
      top: event.clientY,
      left: event.clientX,
    });
    setShowMenu(true);
  };

  const handleUpdateProject = async () => {
    const newName = prompt('Enter the new project name:', selectedProject.name);
    setShowMenu(false);
    if (!newName || newName.trim() === '') {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project.');
      }

      // Update the local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === selectedProject.id ? { ...p, name: newName.trim() } : p
        )
      );

      console.log('Project updated successfully.');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    setShowMenu(false);
    if (!window.confirm(`Are you sure you want to delete "${selectedProject.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/projects/${selectedProject.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project.');
      }

      // Filter out the deleted project from local state
      setProjects(prevProjects =>
        prevProjects.filter(p => p.id !== selectedProject.id)
      );
      setSelectedProject(null); // Deselect the project
      console.log('Project deleted successfully.');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#f59e0b';
      case 'archived': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(99, 102, 241, 0.3)',
            borderTop: '3px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading your projects...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        maxWidth: '1200px',
        margin: '0 auto 40px auto'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 8px 0'
          }}>
            DataQuery AI
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            margin: 0
          }}>
            Select a project to start analyzing your data
          </p>
        </div>
        
        <button
          onClick={onLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Search and Actions Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          gap: '20px'
        }}>
          <div style={{ flex: '1', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreateNewProject}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(99, 102, 241, 0.1)';
              }}
            >
              + New Project
            </button>
          </div>
        </div>

        {/* Project Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px',
          marginBottom: '30px'
        }}>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              style={{
                background: selectedProject?.id === project.id
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: selectedProject?.id === project.id
                  ? '2px solid #6366f1'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: selectedProject?.id === project.id ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: selectedProject?.id === project.id
                  ? '0 8px 25px rgba(99, 102, 241, 0.15)'
                  : '0 4px 6px rgba(0, 0, 0, 0.1)',
                position: 'relative', // Position menu relative to this
              }}
              onMouseEnter={(e) => {
                if (selectedProject?.id !== project.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedProject?.id !== project.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  {project.name}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(project.status)
                  }}></div>
                  <span style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'capitalize'
                  }}>
                    {project.status}
                  </span>
                  {/* Three-dot menu icon */}
                  <span
                    style={{
                      fontSize: '20px',
                      cursor: 'pointer',
                      marginLeft: '10px',
                      padding: '0 5px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 'bold',
                    }}
                    onClick={(e) => handleMenuClick(e, project)}
                  >
                    ⋮
                  </span>
                </div>
              </div>
              
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.4'
              }}>
                {project.description}
              </p>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '16px'
              }}>
                {project.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span>{project.datasetCount} datasets</span>
                  <span>{project.queryCount} queries</span>
                </div>
                <span>{formatDate(project.lastAccessed)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        {selectedProject && (
          <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 1000
          }}>
            <button
              onClick={handleProjectSelect}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
              }}
            >
              Open {selectedProject.name} →
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🔍
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '1.25rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {searchTerm ? 'No projects found' : 'No active projects'}
            </h3>
            <p style={{ margin: 0 }}>
              {searchTerm
                ? 'Try adjusting your search terms or create a new project'
                : 'Your active projects will appear here once you have created them.'
              }
            </p>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: '#1e293b',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h2 style={{ margin: 0, color: 'white' }}>Create New Project</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                style={{
                  padding: '10px',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Upload File
              </label>
              <div style={{
                border: '2px dashed #475569',
                borderRadius: '6px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                backgroundColor: newProjectFile ? '#334155' : 'transparent',
                position: 'relative',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = newProjectFile ? '#334155' : 'transparent'}
              >
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  {newProjectFile ? newProjectFile.name : 'Click or drag to upload a file (CSV, JSON)'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowNewProjectModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#64748b',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNewProject}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: (!newProjectName || !newProjectFile) ? 0.5 : 1
                }}
                disabled={!newProjectName || !newProjectFile}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Three-dot menu */}
      {showMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={handleUpdateProject}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              padding: '12px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              borderBottom: '1px solid #334155',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#334155')}
            onMouseLeave={(e) => (e.target.style.background = 'none')}
          >
            Rename Project
          </button>
          <button
            onClick={handleDeleteProject}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              padding: '12px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.1)')}
            onMouseLeave={(e) => (e.target.style.background = 'none')}
          >
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectSelection;    