const axios = require("axios");
const fs = require('fs/promises');
const path = require('path');
const fsSync = require('fs'); // for sync checks
const { v4: uuidv4 } = require('uuid');
const dbPath = path.join(__dirname, '..', 'database.json');
const filesDir = path.join(__dirname, '..', 'files');
// --- Helper Functions ---
if (!fsSync.existsSync(filesDir)) {
  fsSync.mkdirSync(filesDir, { recursive: true });
}
// Read the database file
const readDB = async () => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist or is empty, return an empty array
        if (error.code === 'ENOENT' || error.message.includes('Unexpected end of JSON input')) {
            return [];
        }
        throw error;
    }
};

// Write to the database file
const writeDB = async (data) => {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
};

// --- Placeholder LLM Function ---

const FormData = require("form-data");
async function send_to_llm(file_path, prompt) {
    console.log(file_path);
    try {
        console.log("Sending data to LLM with prompt:", prompt);

        // Send JSON payload instead of file stream
        //console.log(file_path);
        const response = await axios.post(
            "http://127.0.0.1:8000/analyze-file-with-prompt",
            {
                file_path: file_path, // path of the file
                prompt: prompt
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
            }
        );

        return response.data; // backend's response
    } catch (error) {
        console.error("Error while sending to LLM:", error.message);
        throw error;
    }
}

// --- Controller Functions ---

// GET /projects - Retrieve all projects
exports.getAllProjects = async (req, res) => {
    try {
        const projects = await readDB();
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving projects", error: error.message });
    }
};

// POST /projects - Create a new project
exports.createProject = async (req, res) => {
  try {
    // --- read name + incoming file info ---
    const { name } = req.body;
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    // Accept either req.file (multer) OR a provided path in JSON (file or file_location)
    const uploadedFile = req.file || null;
    const providedFilePath = (req.body.file || req.body.file_location)
      ? String(req.body.file || req.body.file_location).trim()
      : null;

    // Validate
    if (!name || name.trim() === '' || (!uploadedFile && !providedFilePath)) {
      return res.status(400).json({ message: "Project name and dataFile are required." });
    }

    // Ensure filesDir exists (filesDir must be defined at module top — see note)
    const backendRoot = path.resolve(path.join(__dirname, '..'));
    if (!fsSync.existsSync(filesDir)) fsSync.mkdirSync(filesDir, { recursive: true });

    // --- Determine absolute source path ---
    let sourcePath;
    if (uploadedFile) {
      // multer saved file to disk. Use its path (could be relative), resolve to absolute.
      // multer commonly sets req.file.path like "files/12345-name.ext"
      sourcePath = path.isAbsolute(uploadedFile.path)
        ? path.resolve(uploadedFile.path)
        : path.resolve(path.join(__dirname, '..', uploadedFile.path));
    } else {
      // providedFilePath may be absolute (C:\...) or relative (.\files\demo.csv)
      if (path.isAbsolute(providedFilePath)) {
        sourcePath = path.resolve(providedFilePath);
      } else {
        // normalize relative path (strip leading ./ or .\ and convert slashes)
        let rel = providedFilePath.replace(/^[.][\\/]/, '');
        rel = rel.replace(/\\/g, path.sep).replace(/\//g, path.sep);
        sourcePath = path.resolve(path.join(__dirname, '..', rel));
      }
    }

    // Check file exists
    try {
      await fs.access(sourcePath);
    } catch (err) {
      return res.status(400).json({ message: `Source file not found or not accessible: ${sourcePath}` });
    }

    // --- Security: allow outside-backend copying only if explicitly enabled ---
    const allowOutside = process.env.ALLOW_OUTSIDE_BACKEND === 'true';
    if (!allowOutside) {
      if (!sourcePath.startsWith(backendRoot + path.sep) && sourcePath !== backendRoot) {
        return res.status(400).json({
          message:
            "Source file must be inside the backend project directory. To allow outside paths set ALLOW_OUTSIDE_BACKEND=true."
        });
      }
    }

    // --- Copy logic: avoid copying twice if multer already saved into filesDir ---
    let copiedName;
    if (uploadedFile) {
      const uploadedAbsolute = sourcePath;
      if (path.dirname(uploadedAbsolute) === path.resolve(filesDir)) {
        // already inside filesDir — reuse it (no copy)
        copiedName = path.basename(uploadedAbsolute);
      } else {
        // copy uploaded file into filesDir
        copiedName = `${Date.now()}-${path.basename(uploadedAbsolute)}`;
        const destPath = path.join(filesDir, copiedName);
        await fs.copyFile(uploadedAbsolute, destPath);
      }
    } else {
      // source came from provided path — copy into filesDir
      copiedName = `${Date.now()}-${path.basename(sourcePath)}`;
      const destPath = path.join(filesDir, copiedName);
      await fs.copyFile(sourcePath, destPath);
    }

    // stored file_location in requested Windows-style format (JSON will escape backslashes)
    const storedFileLocation = `.\\files\\${copiedName}`;

    // --- Create & save project ---
    const newProject = {
      id: uuidv4(),
      name: name,
      file_location: storedFileLocation
    };

    const projects = await readDB();
    projects.push(newProject);
    await writeDB(projects);

    console.log("Created project:", newProject);
    return res.status(201).json(newProject);

  } catch (error) {
    console.error("createProject error:", error);
    return res.status(500).json({ message: "Error creating project", error: error.message });
  }
};



// PUT /projects/:id - Update a project's name
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Project name is required." });
        }

        const projects = await readDB();
        const projectIndex = projects.findIndex(p => p.id === id);

        if (projectIndex === -1) {
            return res.status(404).json({ message: "Project not found." });
        }

        projects[projectIndex].name = name;
        await writeDB(projects);

        res.status(200).json(projects[projectIndex]);
    } catch (error) {
        res.status(500).json({ message: "Error updating project", error: error.message });
    }
};

// DELETE /projects/:id - Delete a project
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const projects = await readDB();
        const projectToDelete = projects.find(p => p.id === id);

        if (!projectToDelete) {
            return res.status(404).json({ message: "Project not found." });
        }

        // Filter out the project to delete
        const updatedProjects = projects.filter(p => p.id !== id);
        await writeDB(updatedProjects);

        // Delete the associated file
        if (projectToDelete.file_location) {
            try {
                await fs.unlink(path.join(__dirname, '..', projectToDelete.file_location));
            } catch (fileError) {
                // Log the error but don't fail the whole request
                // The file might have been deleted manually
                console.error("Error deleting file:", fileError.message);
            }
        }

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting project", error: error.message });
    }
};

// POST /projects/insight/:id - Generate an insight
exports.getProjectInsight = async (req, res) => {
    try {
        const { id } = req.params;
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ message: "A prompt is required." });
        }
        
        const projects = await readDB();
        const project = projects.find(p => p.id === id);

        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        // Read the file content
        const fileContent = await fs.readFile(project.file_location, 'utf8');
        
        // Get insight from the placeholder function
        const fullPrompt = prompt + " You are a helpful AI assistant for a data analysis application. I need you to analyze a dataset based on a user's query and return the results in a strict JSON format. The JSON object must contain the following three keys: Generate_SQL: A string containing the SQL query that would be used to produce the requested data. Result_in_csv: A string containing the data in comma-separated values (CSV) format. The first line should be the column headers. Key_insight: (Should be deatil at least one paragraph)A string containing a detailed summary of the key findings from the data which we will get from that perticular query or prompt, such as trends or interesting observations. For example: JSON { \"Generate_SQL\": \"SELECT category, COUNT(*) FROM sales GROUP BY category;\", \"Result_in_csv\": \"category,count\\nElectronics,15000\\nClothing,8000\", \"Key_insight\": \"Electronics is the top-performing category by sales volume.\" } Please provide a response in this exact format. If you cannot generate one of the fields, return an empty string for that field.";
        const insight = await send_to_llm(project.file_location, fullPrompt);
        console.log(insight)
        res.status(200).json(insight);
    } catch (error) {
        res.status(500).json({ message: "Error generating insight", error: error.message });
    }
};


// GET /projects - Retrieve all projects
exports.getSmartSuggestion = async (req, res) => {
    try {
        const { id } = req.params;
        const projects = await readDB();
        const project = projects.find(p => p.id === id);
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }
        const insight = await send_to_llm(project.file_location, "You are a helpful AI assistant for a data analysis application. I need you to suggest 8 smart and meaningful questions that I can ask about the uploaded database. Your response must be a strict JSON object with exactly one key: { \"Suggested_Questions\": [\"Question 1\",\"Question 2\",\"Question 3\",\"Question 4\",\"Question 5\",\"Question 6\",\"Question 7\",\"Question 8\"] } Only return valid JSON. Do not include explanations or extra text outside the JSON.");
        console.log(insight);
        res.status(200).json(insight);
    } catch (error) {
        res.status(500).json({ message: "Error generating insight", error: error.message });
    }
};




// function to update the database
// PUT /projects/:id/file - Update a project's file
// PUT /projects/:id/file - Update a project's file
exports.updateProjectFile = async (req, res) => {
    try {
        const { id } = req.params;
        const uploadedFile = req.file || null;
        const providedFilePath = (req.body.file || req.body.file_path || req.body.file_location)
            ? String(req.body.file || req.body.file_path || req.body.file_location).trim()
            : null;

        // Validate
        if (!uploadedFile && !providedFilePath) {
            return res.status(400).json({ message: "A new file is required to update the project." });
        }

        // Find the project
        const projects = await readDB();
        const projectIndex = projects.findIndex(p => p.id === id);

        if (projectIndex === -1) {
            return res.status(404).json({ message: "Project not found." });
        }

        // --- Determine absolute source path ---
        let sourcePath;
        const backendRoot = path.resolve(__dirname, '..');

        if (uploadedFile) {
            sourcePath = path.resolve(uploadedFile.path);
        } else {
            // FIX: Handle cases where the path might already include the 'files' directory
            const normalizedPath = providedFilePath.replace(/\\/g, '/'); // Normalize to forward slashes for consistent checks
            
            // Check if the path is already inside the 'files' directory
            if (normalizedPath.startsWith('files/')) {
                sourcePath = path.resolve(path.join(backendRoot, providedFilePath));
            } else if (normalizedPath.startsWith('Backend/')) {
                // Remove the 'Backend' prefix to avoid duplication
                sourcePath = path.resolve(path.join(backendRoot, normalizedPath.substring('Backend/'.length)));
            }
            else {
                // Assume the path is relative to the backend root
                sourcePath = path.resolve(path.join(backendRoot, providedFilePath));
            }
        }
        
        // Check if the source file exists
        try {
            await fs.access(sourcePath);
        } catch (err) {
            console.error(err);
            return res.status(400).json({ message: `Source file not found or not accessible: ${sourcePath}` });
        }

        // --- Copy the new file into the filesDir ---
        const filesDir = path.join(backendRoot, '.\\files');
        if (!fsSync.existsSync(filesDir)) fsSync.mkdirSync(filesDir, { recursive: true });

        const copiedName = `${Date.now()}-${path.basename(sourcePath)}`;
        const destPath = path.join(filesDir, copiedName);

        // Delete old file
        const oldFileLocation = projects[projectIndex].file_location;
        if (oldFileLocation) {
            const oldFilePath = path.resolve(path.join(backendRoot, oldFileLocation));
            try {
                await fs.unlink(oldFilePath);
            } catch (fileError) {
                console.error("Error deleting old file:", fileError.message);
            }
        }

        await fs.copyFile(sourcePath, destPath);

        // Update project with new file location in DB
        const storedFileLocation = `.\\files\\${copiedName}`;

        projects[projectIndex].file_location = storedFileLocation;
        await writeDB(projects);

        console.log("Updated project file:", projects[projectIndex]);
        return res.status(200).json(projects[projectIndex]);

    } catch (error) {
        console.error("updateProjectFile error:", error);
        return res.status(500).json({ message: "Error updating project file", error: error.message });
    }
};