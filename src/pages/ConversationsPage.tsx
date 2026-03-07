import { useState } from "react";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ChatPanel } from "@/components/conversations/ChatPanel";
import { ClientDetailPanel } from "@/components/conversations/ClientDetailPanel";

const ConversationsPage = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <ConversationList
        selectedId={selectedContatoId}
        onSelect={(contatoId) => setSelectedContatoId(contatoId)}
      />
      <ChatPanel contatoId={selectedContatoId} />
      {selectedContatoId && (
        <ClientDetailPanel contatoId={selectedContatoId} />
      )}
    </div>
  );
};

export default ConversationsPage;
