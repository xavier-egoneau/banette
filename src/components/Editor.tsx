import { useEffect } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { CodeBlockComponent } from './CodeBlockComponent'

const lowlight = createLowlight()
lowlight.register('html', html)
lowlight.register('css', css)
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('json', json)
lowlight.register('bash', bash)
lowlight.register('python', python)
lowlight.register('sql', sql)
lowlight.register('markdown', markdown)
lowlight.register('plaintext', plaintext)

interface EditorProps {
  content: string
  onChange: (markdown: string) => void
  editable?: boolean
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`px-2 py-1 rounded text-sm font-ui transition-colors ${
        active
          ? 'bg-paper-border text-ink-dark'
          : 'text-ink hover:bg-paper-line/50 hover:text-ink-dark'
      }`}
    >
      {children}
    </button>
  )
}

export function Editor({ content, onChange, editable = true }: EditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        }
      }).configure({ lowlight, defaultLanguage: 'plaintext' }),
      Markdown.configure({
        html: false,
        transformCopiedText: true
      })
    ],
    content: '',
    editable,
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown()
      onChange(markdown)
    }
  })

  // Set initial content from markdown
  useEffect(() => {
    if (!editor) return
    const currentMarkdown = editor.storage.markdown.getMarkdown()
    if (currentMarkdown !== content) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  // Update editable state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  if (!editor) return <div className="flex-1" />

  return (
    <div className="flex flex-col h-full">
      {editable && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-paper-border bg-paper-dark/50 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Gras (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italique (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Barré"
          >
            <span className="line-through">S</span>
          </ToolbarButton>

          <span className="w-px h-5 bg-paper-border mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Titre 1"
          >
            H1
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Titre 2"
          >
            H2
          </ToolbarButton>

          <span className="w-px h-5 bg-paper-border mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Liste à puces"
          >
            •≡
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Liste numérotée"
          >
            1≡
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Liste de tâches"
          >
            ☑
          </ToolbarButton>

          <span className="w-px h-5 bg-paper-border mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Citation"
          >
            ❝
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Bloc de code"
          >
            {'</>'}
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            title="Séparateur"
          >
            —
          </ToolbarButton>
        </div>
      )}

      <div className="flex-1 overflow-y-auto editor-paper relative">
        <EditorContent
          editor={editor}
          className="h-full"
        />
      </div>
    </div>
  )
}
