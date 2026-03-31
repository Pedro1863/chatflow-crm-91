import { useState } from "react";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ChatPanel } from "@/components/conversations/ChatPanel";
import { ClientDetailPanel } from "@/components/conversations/ClientDetailPanel";
import { InactivityPopup } from "@/components/conversations/InactivityPopup";

const ConversationsPage = () => {
  const [selectedContatoId, setSelectedContatoId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Hide details when changing contact
  const handleSelect = (contatoId: string) => {
    setSelectedContatoId(contatoId);
    setShowDetails(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        selectedId={selectedContatoId}
        onSelect={handleSelect}
      />
      <ChatPanel
        contatoId={selectedContatoId}
        onToggleDetails={() => setShowDetails((v) => !v)}
      />
      {selectedContatoId && showDetails && (
        <ClientDetailPanel contatoId={selectedContatoId} />
      )}
      <InactivityPopup />
    </div>
  );
};

export default ConversationsPage;
