import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

const LANGUAGES = [
  'plaintext',
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'go',
  'graphql',
  'html',
  'ini',
  'java',
  'javascript',
  'json',
  'kotlin',
  'lua',
  'markdown',
  'php',
  'python',
  'ruby',
  'rust',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml',
] as const;

export function CodeBlockView({ node, updateAttributes, extension }: NodeViewProps) {
  const current: string = node.attrs.language || extension.options.defaultLanguage || 'plaintext';

  return (
    <NodeViewWrapper className="nook-code-block">
      <select
        className="nook-code-lang"
        contentEditable={false}
        value={current}
        onChange={(e) => updateAttributes({ language: e.target.value })}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre>
        {/* @ts-expect-error NodeViewContent accepts any tag at runtime */}
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
