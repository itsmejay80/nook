import type { Card } from '@nook/contracts';
import { CalendarCard } from '../cards/CalendarCard.js';
import { DocumentCard } from '../cards/DocumentCard.js';
import { NoteCard } from '../cards/NoteCard.js';
import { TodoCard } from '../cards/TodoCard.js';
import { WebsiteCard } from '../cards/WebsiteCard.js';

interface CardShellProps {
  card: Card;
}

export function CardShell({ card }: CardShellProps) {
  return (
    <div className="flex h-full w-full flex-col bg-[var(--card)]">
      <div className="min-h-0 flex-1 overflow-hidden">
        <CardBody card={card} />
      </div>
    </div>
  );
}

function CardBody({ card }: { card: Card }) {
  switch (card.type) {
    case 'note':
      return <NoteCard card={card} />;
    case 'todo':
      return <TodoCard card={card} />;
    case 'website':
      return <WebsiteCard card={card} />;
    case 'document':
      return <DocumentCard card={card} />;
    case 'calendar':
      return <CalendarCard card={card} />;
  }
}
