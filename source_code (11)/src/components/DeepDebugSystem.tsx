import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Download, AlertCircle, CheckCircle, XCircle, Loader2, Upload, FileText, Eye, Folder, File, Code, FolderOpen } from 'lucide-react';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path?: string;
  file?: File;
  children?: FileItem[];
}

export const DeepDebugSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<{name: string, content: string} | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  // ファイルアップロード処理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadedFiles(files);
    const structure: FileItem[] = [];

    // ファイル構造を解析
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      const parts = path.split('/');

      let current = structure;
      let currentPath = '';

      for (let j = 0; j < parts.length - 1; j++) {
        const folderName = parts[j];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folder = current.find(item => item.name === folderName && item.type === 'folder');
        if (!folder) {
          folder = { name: folderName, type: 'folder', path: currentPath, children: [] };
          current.push(folder);
        }
        current = folder.children!;
      }

      // ファイルを追加
      current.push({
        name: parts[parts.length - 1],
        type: 'file',
        file: file,
        path: path
      });
    }

    // 自動的に最初のフォルダを展開
    if (structure.length > 0 && structure[0].type === 'folder') {
      setExpandedFolders(new Set([structure[0].path || structure[0].name]));
    }

    setFileStructure(structure);
    console.log('📁 ファイル構造:', structure);
  };

  // フォルダの展開/折りたたみ
  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // ファイル内容を表示
  const handleFileView = async (fileItem: FileItem) => {
    if (fileItem.type !== 'file' || !fileItem.file) return;

    try {
      const content = await fileItem.file.text();
      setSelectedFile({
        name: fileItem.path || fileItem.name,
        content: content
      });
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      setSelectedFile({
        name: fileItem.name,
        content: 'ファイルの読み込みに失敗しました'
      });
    }
  };

  // ファイルダウンロード
  const handleFileDownload = (fileItem: FileItem) => {
    if (fileItem.type !== 'file' || !fileItem.file) return;

    const url = URL.createObjectURL(fileItem.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileItem.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 全ファイルダウンロード（ZIP形式）
  const handleDownloadAll = async () => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      alert('ダウンロードするファイルがありません');
      return;
    }

    try {
      // JSZipを動的にインポート
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // すべてのファイルをZIPに追加
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const path = file.webkitRelativePath || file.name;
        const content = await file.arrayBuffer();
        zip.file(path, content);
      }

      // ZIPファイルを生成してダウンロード
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'source_code_11.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('ZIP作成エラー:', error);
      alert('ファイルのダウンロードに失敗しました');
    }
  };

  // ファイルツリーのレンダリング
  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item, index) => {
      const isExpanded = expandedFolders.has(item.path || item.name);

      return (
        <div key={`${item.path}-${index}`}>
          <div
            className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer group"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {item.type === 'folder' ? (
              <>
                <button
                  onClick={() => toggleFolder(item.path || item.name)}
                  className="flex items-center gap-1 flex-1 text-left"
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                      <FolderOpen className="w-4 h-4 text-yellow-600" />
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3 h-3 text-gray-500" />
                      <Folder className="w-4 h-4 text-yellow-600" />
                    </>
                  )}
                  <span className="text-sm font-medium">{item.name}</span>
                </button>
              </>
            ) : (
              <>
                <File className="w-4 h-4 text-gray-500 ml-4" />
                <span className="text-sm flex-1">{item.name}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button
                    onClick={() => handleFileView(item)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="表示"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleFileDownload(item)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="ダウンロード"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
          {item.type === 'folder' && item.children && isExpanded && (
            <div>
              {renderFileTree(item.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // ファイル拡張子から言語を判定
  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={togglePanel}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Upload className="w-6 h-6 text-blue-600" />
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-800">Deep Debug System</h3>
            <p className="text-sm text-gray-600">source_code (11) ディレクトリアップローダー</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* コンテンツ */}
      <div className={`border-t ${isOpen ? 'block' : 'hidden'}`}>
        <div className="p-6 space-y-6">
          {/* アップロードエリア */}
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
            <input
              ref={fileInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="folder-upload"
            />
            <Folder className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <label
              htmlFor="folder-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              source_code (11) ディレクトリを選択
            </label>
            <p className="text-sm text-gray-600 mt-3">
              クリックしてディレクトリを選択するか、ドラッグ＆ドロップしてください
            </p>
          </div>

          {/* ファイル構造表示 */}
          {fileStructure.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-yellow-600" />
                  アップロードされたファイル構造
                  <span className="text-sm text-gray-500">
                    ({uploadedFiles?.length || 0} ファイル)
                  </span>
                </h4>
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  すべてダウンロード (ZIP)
                </button>
              </div>

              <div className="border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                <div className="p-2">
                  {renderFileTree(fileStructure)}
                </div>
              </div>
            </div>
          )}

          {/* ファイル内容表示 */}
          {selectedFile && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({selectedFile.content.length.toLocaleString()} 文字)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 text-xs overflow-x-auto max-h-96">
                <code className={`language-${getLanguageFromExtension(selectedFile.name)}`}>
                  {selectedFile.content}
                </code>
              </pre>
            </div>
          )}

          {/* 使用方法 */}
          {fileStructure.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">使用方法</h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>「source_code (11) ディレクトリを選択」ボタンをクリック</li>
                    <li>source_code (11) フォルダを選択</li>
                    <li>アップロードされたファイルを個別に表示・ダウンロード</li>
                    <li>または「すべてダウンロード」でZIP形式で一括ダウンロード</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};