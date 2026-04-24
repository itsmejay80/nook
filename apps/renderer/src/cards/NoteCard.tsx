import { useEffect, useRef } from 'react';
import { EditorContent, ReactNodeViewRenderer, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { CodeBlockView } from './CodeBlockView.js';
import {
  Bold as BoldIcon,
  Code as CodeIcon,
  Code2 as CodeBlockIcon,
  Heading1,
  Heading2,
  Italic as ItalicIcon,
  List as BulletIcon,
  ListOrdered,
  Quote as QuoteIcon,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import type { Card, NoteData } from '@nook/contracts';
import { useCards } from '../stores/cards.js';

interface NoteCardProps {
  card: Card;
}

const parseNoteData = (raw: unknown): NoteData => {
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<NoteData>;
    return {
      contentJson: obj.contentJson ?? {},
      contentMd: typeof obj.contentMd === 'string' ? obj.contentMd : '',
    };
  }
  return { contentJson: {}, contentMd: '' };
};

const isProseMirrorDoc = (value: unknown): value is { type: string } =>
  !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';

const initialContent = (data: NoteData) => {
  if (isProseMirrorDoc(data.contentJson)) return data.contentJson;
  if (data.contentMd) return data.contentMd;
  return null;
};

const lowlight = createLowlight(common);

const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight, defaultLanguage: 'plaintext' });

const extensions = [
  StarterKit.configure({ codeBlock: false }),
  CodeBlock,
  Markdown.configure({ transformPastedText: true }),
];

export function NoteCard({ card }: NoteCardProps) {
  const updateData = useCards((s) => s.updateData);
  const initial = useRef<NoteData>(parseNoteData(card.data));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions,
    content: initialContent(initial.current),
    editorProps: {
      attributes: {
        class:
          'nook-note focus:outline-none h-full overflow-auto px-5 py-4 text-[14px] leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const json = editor.getJSON();
        const md =
          (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ??
          '';
        updateData(card.id, { contentJson: json, contentMd: md } satisfies NoteData).catch(() => {});
      }, 400);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (editor) {
          const json = editor.getJSON();
          const md =
            (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ??
            '';
          window.nook.cards
            .updateData({ id: card.id, data: { contentJson: json, contentMd: md } satisfies NoteData })
            .catch(() => {});
        }
      }
    };
  }, [editor, card.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar editor={editor} />
      <div className="min-h-0 flex-1">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}

interface ToolbarProps {
  editor: Editor | null;
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return <div className="h-9 shrink-0 border-b border-[var(--line)] bg-[var(--card-2)]" />;

  const btn = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center text-[var(--ink-3)] transition-colors hover:bg-[var(--hover-strong)] hover:text-[var(--ink)] ${
      active ? 'bg-[var(--hover-strong)] text-[var(--ink)]' : ''
    }`;

  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[var(--line)] bg-[var(--card-2)] px-2">
      <button
        type="button"
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <BoldIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <ItalicIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('underline'))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('code'))}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <CodeIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('codeBlock'))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        aria-label="Code block"
      >
        <CodeBlockIcon className="h-3.5 w-3.5" />
      </button>
      <div className="mx-2 h-4 w-px bg-[var(--line-2)]" />
      <button
        type="button"
        className={btn(editor.isActive('heading', { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-label="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <div className="mx-2 h-4 w-px bg-[var(--line-2)]" />
      <button
        type="button"
        className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <BulletIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Blockquote"
      >
        <QuoteIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
