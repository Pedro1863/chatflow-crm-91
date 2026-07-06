import { defineMcp } from "@lovable.dev/mcp-js";
import searchContatosTool from "./tools/search-contatos";
import getRecentMessagesTool from "./tools/get-recent-messages";
import listOrdersTool from "./tools/list-orders";
import pipelineSummaryTool from "./tools/pipeline-summary";

export default defineMcp({
  name: "flowcrm-mcp",
  title: "FlowCRM MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the FlowCRM WhatsApp CRM. Use `search_contatos` to find a contact, `get_recent_messages` for their chat history, `list_orders` for purchases, and `pipeline_summary` for funnel counts.",
  tools: [searchContatosTool, getRecentMessagesTool, listOrdersTool, pipelineSummaryTool],
});
