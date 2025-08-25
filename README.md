# 🚀 Kurukshetra Hackathon Project

## 📋 Overview

A comprehensive data analysis and visualization platform that combines natural language processing with SQL capabilities. This project features an intelligent chat interface, advanced SQL compiler, and beautiful data visualization tools to make data analysis accessible to everyone.

## ✨ Features

### 🎨 **Data Visualization Addon**
- **Smart Chart Detection**: Automatically determines the best chart type based on data patterns
- **Multiple Chart Types**: Bar, Line, Pie, Doughnut, Scatter, Radar, and Polar Area charts
- **Beautiful UI**: Modern glassmorphism design with smooth animations
- **Advanced Customization**: Color schemes, chart titles, and column mapping
- **Export Functionality**: Save charts as high-quality images
- **Responsive Design**: Works perfectly on all device sizes

### 💬 **Intelligent Chat Interface**
- **Natural Language Processing**: Ask questions in plain English
- **Automatic SQL Generation**: Converts natural language to SQL queries
- **Real-time Responses**: Instant data analysis and insights
- **Query History**: Track and reuse previous queries
- **Smart Suggestions**: Context-aware query recommendations

### 🔧 **Advanced SQL Compiler**
- **Multi-Table Support**: Upload and analyze multiple datasets simultaneously
- **Natural Language to SQL**: Convert English descriptions to SQL queries
- **File Upload Support**: CSV, JSON, Excel files
- **Schema Analysis**: Automatic column type detection and data preview
- **Query Examples**: Pre-built examples for common operations
- **Export Results**: Download query results as CSV files

### 🎯 **Smart Features**
- **Auto-Detection**: Intelligent chart type selection based on data characteristics
- **Data Analysis**: Statistical insights and pattern recognition
- **Cross-Platform**: Works seamlessly across different browsers and devices
- **Performance Optimized**: Efficient data processing and rendering

## 🏗️ Architecture

### **Frontend (React.js)**
- **Framework**: React.js with modern hooks
- **Styling**: CSS3 with glassmorphism effects
- **Charts**: Chart.js with React-ChartJS-2 wrapper
- **State Management**: React hooks (useState, useRef, useMemo)
- **Responsive Design**: Mobile-first approach

### **Backend (Node.js)**
- **Runtime**: Node.js with Express.js
- **File Handling**: Multer for file uploads
- **CORS**: Cross-origin resource sharing enabled
- **API Design**: RESTful endpoints
- **Data Processing**: Advanced SQL query generation

### **Data Processing**
- **LLM Integration**: Natural language to SQL conversion
- **File Analysis**: Automatic schema detection
- **Query Optimization**: Efficient SQL generation
- **Error Handling**: Comprehensive error management

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn package manager
- Modern web browser

### **Installation**

#### **1. Clone the Repository**
```bash
git clone https://github.com/KrishnaSadar/KurukshetraHackthon.git
cd KurukshetraHackthon
```

#### **2. Backend Setup**
```bash
cd Backend
npm install
npm start
```
The backend server will start on `http://localhost:5000`

#### **3. Frontend Setup**
```bash
cd Frontend_Auth
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`

#### **4. LLM Service Setup**
```bash
cd LLM
pip install -r requirements.txt
python main.py
```
The LLM service will start on `http://localhost:8000`

## 📁 Project Structure

```
KurukshetraHackthon/
├── Backend/                 # Node.js backend server
│   ├── controllers/         # API controllers
│   ├── routes/             # API routes
│   ├── files/              # Uploaded files storage
│   ├── model/              # Data models
│   └── index.js            # Main server file
├── Frontend_Auth/          # React.js frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── SQLCompiler.jsx
│   │   │   ├── DataVisualization.jsx
│   │   │   └── ChartDisplay.jsx
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # App entry point
│   └── package.json
├── LLM/                    # Python LLM service
│   ├── main.py             # LLM server
│   └── requirements.txt    # Python dependencies
└── README.md
```

## 🎯 Usage Guide

### **1. Data Visualization**
- Upload data files (CSV, JSON, Excel)
- Ask questions in natural language
- View automatically generated charts
- Customize chart appearance and type
- Export visualizations as images

### **2. SQL Compiler**
- Upload multiple tables
- Write natural language queries
- Execute complex SQL operations
- View results in tabular format
- Generate beautiful visualizations

### **3. Chat Interface**
- Ask data analysis questions
- Get instant insights and charts
- View query history
- Copy generated SQL queries
- Export results as CSV

## 🔧 Configuration

### **Environment Variables**
Create `.env` files in respective directories:

#### **Backend (.env)**
```env
PORT=5000
NODE_ENV=development
```

#### **Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000
VITE_LLM_URL=http://localhost:8000
```

## 🎨 Features in Detail

### **Data Visualization Addon**
- **Smart Detection**: Analyzes data types, patterns, and relationships
- **7 Chart Types**: Comprehensive visualization options
- **Color Schemes**: Multiple beautiful color palettes
- **Responsive**: Adapts to all screen sizes
- **Export**: High-quality image downloads

### **SQL Compiler**
- **Multi-Table**: Support for up to 5 tables simultaneously
- **Schema Analysis**: Automatic column type detection
- **Query Examples**: Pre-built examples for learning
- **Error Handling**: Comprehensive error messages
- **File Support**: CSV, JSON, Excel formats

### **Chat Interface**
- **NLP**: Natural language processing for queries
- **Auto-SQL**: Automatic SQL generation
- **History**: Query history and reuse
- **Suggestions**: Smart query recommendations
- **Real-time**: Instant responses and updates

## 🛠️ Development

### **Running in Development Mode**
```bash
# Backend (with auto-restart)
cd Backend
npm run dev

# Frontend (with hot reload)
cd Frontend_Auth
npm run dev

# LLM Service
cd LLM
python main.py
```

### **Building for Production**
```bash
# Frontend build
cd Frontend_Auth
npm run build

# Backend (production)
cd Backend
npm start
```

## 🧪 Testing

### **Frontend Testing**
```bash
cd Frontend_Auth
npm test
```

### **Backend Testing**
```bash
cd Backend
npm test
```

## 📊 API Endpoints

### **Backend API (Port 5000)**
- `GET /` - Health check
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### **LLM API (Port 8000)**
- `POST /upload-and-analyze/` - Upload and analyze files
- `POST /advanced-sql-query/` - Generate SQL from natural language

## 🎯 Use Cases

### **Business Intelligence**
- Sales trend analysis
- Customer segmentation
- Performance metrics
- Financial reporting

### **Data Analysis**
- Statistical analysis
- Pattern recognition
- Correlation studies
- Distribution analysis

### **Research & Development**
- Experimental data visualization
- Scientific data representation
- Comparative analysis
- Trend identification

## 🔮 Future Enhancements

- **3D Charts**: Three-dimensional visualizations
- **Interactive Dashboards**: Multi-chart dashboards
- **Real-time Updates**: Live data streaming
- **Advanced Analytics**: Statistical analysis tools
- **Custom Themes**: User-defined color schemes
- **Machine Learning**: Predictive analytics
- **Collaboration**: Multi-user support
- **Cloud Integration**: AWS, Azure, GCP support

## 🐛 Troubleshooting

### **Common Issues**

#### **Backend Not Starting**
```bash
# Check if port 5000 is available
lsof -i :5000
# Kill process if needed
kill -9 <PID>
```

#### **Frontend Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **LLM Service Issues**
```bash
# Check Python dependencies
pip install -r requirements.txt
# Verify Python version (3.8+)
python --version
```

### **Performance Optimization**
- Use smaller datasets for testing
- Enable browser caching
- Optimize image sizes
- Use production builds

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributors

### **Backend Development**
- **Jayesh Bairagi** - Backend Architecture & API Development
- **Krishna Sadar** - Backend Logic & Database Integration

### **Frontend Development**
- **Tanishq Thuse** - React Components & UI/UX Design
- **Anand Chapke** - Data Visualization & Chart Integration
- **Yaash Bhosale** - Frontend Architecture & State Management

## 🙏 Acknowledgments

- **Chart.js** - For powerful charting capabilities
- **React.js** - For the amazing frontend framework
- **Node.js** - For the robust backend runtime
- **Express.js** - For the web application framework
- **Python LLM** - For natural language processing

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🎉 Conclusion

This project demonstrates the power of combining natural language processing with data visualization to create an intuitive and powerful data analysis platform. The team has successfully built a comprehensive solution that makes data analysis accessible to users of all technical levels.

---

**Built with ❤️ by Team Rocket for Kurukshetra Hackathon**

*Making data analysis beautiful, intelligent, and accessible to everyone.*
