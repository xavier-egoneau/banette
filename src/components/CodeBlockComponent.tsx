import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'

const LANGUAGES = [
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: 'Texte brut' },
]

interface CodeBlockComponentProps {
  node: { attrs: { language: string | null } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  extension: unknown
}

export function CodeBlockComponent({ node, updateAttributes }: CodeBlockComponentProps): JSX.Element {
  const currentLang = node.attrs.language ?? 'plaintext'

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <select
          value={currentLang}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          contentEditable={false}
          className="code-lang-select"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
