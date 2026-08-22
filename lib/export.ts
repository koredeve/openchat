import JSZip from 'jszip';
import { ConversationMessage } from './store';

export function exportAsMarkdown(messages: ConversationMessage[], title: string): string {
  let markdown = `# ${title}\n\n`;
  markdown += `*Exported from OpenChat on ${new Date().toLocaleString()}*\n\n`;

  messages.forEach((msg, i) => {
    const role = msg.role === 'user' ? '👤 You' : '🤖 Assistant';
    markdown += `## ${role}\n\n`;
    markdown += `${msg.content}\n\n`;

    if (msg.tokens || msg.duration) {
      markdown += `**Metrics:**`;
      if (msg.tokens) markdown += ` | Tokens: ${msg.tokens}`;
      if (msg.duration) markdown += ` | Time: ${msg.duration}s`;
      markdown += '\n\n';
    }

    markdown += '---\n\n';
  });

  return markdown;
}

export function exportAsJSON(
  messages: ConversationMessage[],
  title: string,
  model: string
): string {
  return JSON.stringify(
    {
      title,
      model,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages,
    },
    null,
    2
  );
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateProjectZip(
  projectName: string,
  projectType: string,
  description: string
): Promise<Blob> {
  const zip = new JSZip();

  // Create basic project structure based on type
  if (projectType === 'react') {
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: projectName,
          version: '1.0.0',
          description,
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.0.0',
            vite: '^4.3.0',
          },
        },
        null,
        2
      )
    );

    zip.file(
      'src/App.jsx',
      `export default function App() {
  return (
    <div className="container">
      <h1>${projectName}</h1>
      <p>${description}</p>
    </div>
  );
}`
    );

    zip.file(
      'src/main.jsx',
      `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
    );

    zip.file(
      'index.html',
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
    );

    zip.file(
      'README.md',
      `# ${projectName}

${description}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
`
    );
  } else if (projectType === 'node') {
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: projectName,
          version: '1.0.0',
          description,
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js',
          },
          dependencies: {
            express: '^4.18.0',
          },
          devDependencies: {
            nodemon: '^3.0.0',
          },
        },
        null,
        2
      )
    );

    zip.file(
      'index.js',
      `const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '${projectName}' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
    );

    zip.file(
      'README.md',
      `# ${projectName}

${description}

## Setup

\`\`\`bash
npm install
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\``
    );
  } else if (projectType === 'nextjs') {
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: projectName,
          version: '1.0.0',
          description,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        },
        null,
        2
      )
    );

    zip.file(
      'app/page.tsx',
      `export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">${projectName}</h1>
      <p className="mt-4 text-gray-600">${description}</p>
    </main>
  );
}`
    );

    zip.file(
      'README.md',
      `# ${projectName}

${description}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view it.
`
    );
  }

  return zip.generateAsync({ type: 'blob' });
}
