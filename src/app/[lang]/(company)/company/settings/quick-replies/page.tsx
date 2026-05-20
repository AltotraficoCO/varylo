import { MessageSquareText } from 'lucide-react';
import { listQuickReplies } from './actions';
import { QuickReplyForm, EditQuickReplyButton } from './quick-reply-form';
import { DeleteQuickReplyButton } from './delete-button';

export default async function QuickRepliesPage() {
    const replies = await listQuickReplies();

    return (
        <div className="max-w-5xl mx-auto py-8 px-6">
            <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                        Respuestas rápidas
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-2xl">
                        Crea plantillas con un atajo (por ejemplo <code>/saludo</code>) para insertarlas en el chat con un clic.
                        Todos los miembros de tu organización pueden crear, editar y usar estas respuestas.
                    </p>
                </div>
                <QuickReplyForm mode="create" />
            </div>

            {replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                    <MessageSquareText className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">Todavía no hay respuestas rápidas</p>
                    <p className="text-sm mt-1">Crea la primera para tu equipo.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border divide-y">
                    {replies.map((reply) => (
                        <div key={reply.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <code className="text-xs font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                                        {reply.shortcut}
                                    </code>
                                    {reply.createdBy?.name && (
                                        <span className="text-[11px] text-muted-foreground">
                                            por {reply.createdBy.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                    {reply.content}
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                                <EditQuickReplyButton
                                    initial={{
                                        id: reply.id,
                                        shortcut: reply.shortcut,
                                        content: reply.content,
                                    }}
                                />
                                <DeleteQuickReplyButton id={reply.id} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
