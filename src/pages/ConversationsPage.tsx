import { useState } from "react";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ChatPanel } from "@/components/conversations/ChatPanel";
import { ClientDetailPanel } from "@/components/conversations/ClientDetailPanel";

const ConversationsPage = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <ConversationList
        selectedId={selectedConversationId}
        onSelect={(convId, contactId) => {
          setSelectedConversationId(convId);
          setSelectedContactId(contactId);
        }}
      />
      <ChatPanel
        conversationId={selectedConversationId}
        contactId={selectedContactId}
      />
      {selectedContactId && (
        <ClientDetailPanel contactId={selectedContactId} />
      )}
    </div>
  );
};

export default ConversationsPage;
