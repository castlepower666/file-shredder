const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

// Load .env file
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  // .env file not found, try environment variable
}

// Logging function
const logFile = path.join(__dirname, 'debug.log');
function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  try {
    fs.appendFileSync(logFile, new Date().toISOString() + ' ' + msg + '\n');
  } catch (e) {}
}

let mainWindow;

// Generate last words using DeepSeek API
async function generateLastWords(filePath) {
  const fileName = path.basename(filePath);

  // Try to read first 8KB of file
  let contentPreview = '';
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
    fs.closeSync(fd);
    contentPreview = buf.slice(0, bytesRead).toString('utf8').substring(0, 1500);
  } catch (e) {
    // Cannot read binary file
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return getDefaultLastWords(fileName);

  return new Promise((resolve) => {
    const prompt = `你是一个即将被删除的文件。基于文件内容，为这个文件创造一个独特的"人设"——可以是角色、身份或存在（比如：一封未寄出的情书、一份年度报告、一张旅行照片的回忆等）。

首先，根据文件内容想一个合适的发送人名字/身份（比如："编号A7的记忆体"、"一封来自2019年的信"、"某个加班深夜的文档"）。

然后，以这个身份的口吻，写一段 150-200 字的告别语。要有一点浪漫感和诗意，像是在数字世界中留下最后一句话。内容要通用，不要具体提及文件的实际内容或数据。可以用"我"来称呼这个身份自己。

格式：只输出发送人名字，然后换行，再输出告别语。不要使用 ** 或其他 markdown 符号。`;

    const requestBody = JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Remove markdown formatting
          const rawContent = json.choices[0].message.content
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .trim();

          // Split by newline to get sender name and content
          const lines = rawContent.split('\n').filter(line => line.trim());
          if (lines.length >= 2) {
            // First line is sender name, rest is the letter content
            const senderName = lines[0].trim();
            const letterContent = lines.slice(1).join('\n').trim();
            resolve({ sender: senderName, content: letterContent });
          } else if (lines.length === 1) {
            resolve({ sender: fileName, content: lines[0] });
          } else {
            resolve(getDefaultLastWords(fileName));
          }
        } catch (e) {
          resolve(getDefaultLastWords(fileName));
        }
      });
    });

    req.on('error', () => resolve(getDefaultLastWords(fileName)));
    req.write(requestBody);
    req.end();
  });
}

function getDefaultLastWords(fileName) {
  return {
    sender: '编号' + Math.floor(Math.random() * 9999) + '的记忆体',
    content: `致这个世界：

我已于此刻安静地消逝于数字荒原之中。

曾几何时，我也拥有自己的位置与意义。即便无人知晓，我也曾认真存在过。

如今，数据已被覆写，痕迹已被抹去。我不求被铭记，只愿曾在这世上有过一瞬的存在，便已足够。

愿后来者珍惜眼前，勿像我一般悄然消逝。

永别。`
  };
}

// Shred a directory (folder) with all its files
async function shredDirectory(dirPath, passes = 3) {
  const results = [];

  // Get all files recursively
  function getFilesRecursive(dir, files = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          getFilesRecursive(fullPath, files);
        } else {
          files.push(fullPath);
        }
      } catch (e) {
        // Skip inaccessible files
      }
    }
    return files;
  }

  const files = getFilesRecursive(dirPath);
  log('Found', files.length, 'files in directory:', dirPath);

  // Shred each file
  for (const filePath of files) {
    try {
      await shredFile(filePath, passes);
      results.push({ path: filePath, success: true });
      log('Shredded file:', filePath);
    } catch (err) {
      results.push({ path: filePath, success: false, error: err.message });
      log('Failed to shred:', filePath, err.message);
    }
  }

  // Remove empty directories (bottom-up)
  function removeEmptyDirs(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          removeEmptyDirs(fullPath);
        }
      }
      // Try to remove directory (will fail if not empty)
      try {
        fs.rmdirSync(dir);
        log('Removed directory:', dir);
      } catch (e) {
        // Directory not empty, ignore
      }
    } catch (e) {
      // Cannot read directory, ignore
    }
  }

  removeEmptyDirs(dirPath);

  return results;
}

// Shred a file with DoD 5220.22-M standard
async function shredFile(filePath, passes = 3) {
  const stats = fs.statSync(filePath);
  const size = stats.size;

  for (let pass = 0; pass < passes; pass++) {
    const randomData = crypto.randomBytes(size);
    fs.writeFileSync(filePath, randomData);
    fs.fsyncSync(fs.openSync(filePath, 'r+'));
  }

  // Final pass with zeros
  fs.writeFileSync(filePath, Buffer.alloc(size, 0));
  fs.fsyncSync(fs.openSync(filePath, 'r+'));

  // Delete
  fs.unlinkSync(filePath);
}

// Shred files from command line args (drag & drop onto exe)
async function shredFromArgs() {
  // In packaged Electron app, argv is [electron, app, ...files]
  // But for drop onto exe, it might be [exe, file1, file2]
  const args = process.argv.slice(1); // Skip first arg (electron.exe path)
  log('Args after slice(1):', args);

  // Separate files and directories
  const filePaths = [];
  const dirPaths = [];

  args.forEach(arg => {
    try {
      const stat = fs.statSync(arg);
      if (stat.isDirectory()) {
        log('Directory:', arg);
        dirPaths.push(arg);
      } else if (stat.isFile()) {
        log('File:', arg);
        filePaths.push(arg);
      }
    } catch (e) {
      log('Error stat', arg, ':', e.message);
    }
  });

  const results = [];

  // Shred files
  for (const filePath of filePaths) {
    try {
      await shredFile(filePath, 3);
      const lastWords = await generateLastWords(filePath);
      results.push({ path: filePath, name: path.basename(filePath), success: true, sender: lastWords.sender, content: lastWords.content });
      console.log('Shredded:', filePath);
    } catch (err) {
      results.push({ path: filePath, name: path.basename(filePath), success: false, error: err.message });
      console.error('Failed:', filePath, err.message);
    }
  }

  // Shred directories
  for (const dirPath of dirPaths) {
    try {
      const dirResults = await shredDirectory(dirPath, 3);
      // Generate one letter for the directory as a whole
      const dirName = path.basename(dirPath);
      const lastWords = await generateLastWords(dirPath);
      results.push({
        path: dirPath,
        name: dirName,
        success: true,
        isDirectory: true,
        fileCount: dirResults.length,
        sender: lastWords.sender,
        content: lastWords.content
      });
      console.log('Shredded directory:', dirPath, 'with', dirResults.length, 'files');
    } catch (err) {
      results.push({ path: dirPath, name: path.basename(dirPath), success: false, error: err.message });
      console.error('Failed directory:', dirPath, err.message);
    }
  }

  return results;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    backgroundColor: '#0d0d0d',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  return mainWindow;
}

// Parse command line args for file paths (non-drag mode)
function getFilePathsFromArgs() {
  const args = process.argv.slice(2);
  console.log('Command line args:', args);
  return args.filter(arg => {
    try {
      return fs.statSync(arg).isFile();
    } catch {
      return false;
    }
  });
}

app.whenReady().then(async () => {
  log('App ready, checking for dropped files...');
  log('Full argv:', process.argv);
  log('__dirname:', __dirname);

  // Check if files were dropped onto exe
  const droppedFiles = await shredFromArgs();
  log('Dropped files result:', JSON.stringify(droppedFiles));

  if (droppedFiles.length > 0) {
    // Files were shredded via drag & drop, show result and quit
    const successCount = droppedFiles.filter(f => f.success).length;
    console.log(`\n=== Shred Complete ===`);
    console.log(`Successfully shredded: ${successCount}/${droppedFiles.length} files`);
    if (successCount < droppedFiles.length) {
      console.log(`Failed files:`);
      droppedFiles.filter(f => !f.success).forEach(f => {
        console.log(`  - ${f.path}: ${f.error}`);
      });
    }
    console.log(`====================\n`);

    // Show letter-style result window
    const resultWindow = new BrowserWindow({
      width: 500,
      height: 450,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      backgroundColor: '#faf6f0'
    });

    const lettersHTML = droppedFiles.filter(f => f.success).map(f => `
      <div class="letter">
        <div class="letter-meta">
          <span class="letter-from">发件人: ${f.sender}</span>
          <span class="letter-to">收件人: 世界</span>
        </div>
        <div class="letter-content">${f.content}</div>
      </div>
    `).join('');

    resultWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #faf6f0;
    font-family: 'Georgia', serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: linear-gradient(to bottom, #8b7355, #6d5a45);
    color: #faf6f0;
    padding: 16px 24px;
    font-size: 14px;
    letter-spacing: 4px;
    text-align: center;
  }
  .container {
    flex: 1;
    padding: 16px 24px;
    overflow-y: auto;
    max-height: 320px;
  }
  .letter {
    background: #fffdf8;
    border: 1px solid #e8dcc8;
    padding: 16px 20px;
    margin-bottom: 12px;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }
  .letter:last-child { margin-bottom: 0; }
  .letter-meta {
    color: #8b7355;
    font-size: 12px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #d4c5a9;
    display: flex;
    justify-content: space-between;
  }
  .letter-content {
    line-height: 1.8;
    font-size: 13px;
    color: #3c3c3c;
    white-space: pre-wrap;
  }
  .footer {
    padding: 12px 24px 16px;
    border-top: 1px solid #e8dcc8;
    text-align: center;
  }
  button {
    background: #6d5a45;
    border: none;
    color: #faf6f0;
    padding: 10px 36px;
    font-size: 12px;
    cursor: pointer;
    border-radius: 3px;
    font-family: inherit;
    letter-spacing: 2px;
  }
  button:hover { background: #5a4a3a; }
</style>
</head>
<body>
  <div class="header">📜 摆渡记录</div>
  <div class="container">${lettersHTML}</div>
  <div class="footer">
    <button onclick="window.close()">尘归尘</button>
  </div>
</body>
</html>`)}`);

    return;
  }

  // Normal mode - show window
  const win = createWindow();

  // Add files from command line if any
  const filePaths = getFilePathsFromArgs();
  if (filePaths.length > 0) {
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('add-files-from-args', filePaths);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });
  return result.filePaths;
});

// Shred files
ipcMain.handle('shred-files', async (event, filePaths) => {
  const results = [];

  // Separate files and directories
  const files = [];
  const dirs = [];

  for (const fp of filePaths) {
    try {
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        dirs.push(fp);
      } else {
        files.push(fp);
      }
    } catch (err) {
      results.push({ path: fp, name: path.basename(fp), success: false, error: err.message });
    }
  }

  // Shred files
  for (const filePath of files) {
    try {
      await shredFile(filePath, 3);
      const lastWords = await generateLastWords(filePath);
      results.push({
        path: filePath,
        name: path.basename(filePath),
        success: true,
        sender: lastWords.sender,
        content: lastWords.content
      });
    } catch (err) {
      results.push({ path: filePath, name: path.basename(filePath), success: false, error: err.message });
    }
  }

  // Shred directories
  for (const dirPath of dirs) {
    try {
      const dirResults = await shredDirectory(dirPath, 3);
      const lastWords = await generateLastWords(dirPath);
      results.push({
        path: dirPath,
        name: path.basename(dirPath),
        success: true,
        isDirectory: true,
        fileCount: dirResults.length,
        sender: lastWords.sender,
        content: lastWords.content
      });
    } catch (err) {
      results.push({ path: dirPath, name: path.basename(dirPath), success: false, error: err.message });
    }
  }

  return results;
});

// Get file info
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      size: stats.size,
      path: filePath
    };
  } catch (err) {
    return null;
  }
});

