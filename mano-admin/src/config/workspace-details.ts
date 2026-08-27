export type WorkspaceDetail = {
  summary: string;
  purpose: string;
  responsibilities: string[];
  workflow: string[];
  taskGuidance: string;
};

export const workspaceDetails: Record<string, WorkspaceDetail> = {
  "project-a": {
    summary: "Product delivery hub for Alcove across the public frontend, backend API, operations Admin, documentation, and source repository.",
    purpose: "Use this Workspace to keep Alcove engineering requests and implementation context together. A Task should start from a reproducible problem or a clearly defined change, move through ChatGPT-assisted analysis when useful, and retain the resulting Codex instruction and pull request URL.",
    responsibilities: ["Track backend and product issues from discovery through review", "Keep API Docs, operational Admin, frontend, Notion, and GitHub one click away", "Store analysis, implementation instructions, references, and delivery results on the Task", "Use REVIEW before considering an implementation complete"],
    workflow: ["Capture an Issue URL and problem description", "Prepare or paste the ChatGPT analysis", "Copy the generated Codex instruction and perform the repository work", "Save the Codex result and pull request URL", "Review, verify, and move the Task to DONE"],
    taskGuidance: "Create Project Tasks for bugs, API changes, Admin improvements, frontend/backend coordination, documentation work, and release follow-up.",
  },
  "project-t": {
    summary: "Engineering workspace for Tono backend delivery, API operations, internal Admin work, planning, and repository changes.",
    purpose: "Use this Workspace as the operational index for Tono work. It connects the deployed API documentation and Admin with planning material and the backend repository while keeping each requested change in a structured Task.",
    responsibilities: ["Record Tono defects, enhancements, and operational follow-up", "Keep deployed API/Admin links aligned with the source repository", "Preserve issue context, analysis, implementation instructions, and PR evidence", "Separate preparation, implementation, and review using the shared Task states"],
    workflow: ["Link or describe the source issue", "Confirm priority and expected behavior", "Use the ChatGPT prompt for structured analysis when needed", "Hand the saved context to Codex and verify its tests", "Attach the PR URL and finish review"],
    taskGuidance: "Create Project Tasks for backend behavior, API contracts, Admin operations, infrastructure-facing changes, and technical debt that needs a reviewable result.",
  },
  blog: {
    summary: "Content workspace for turning raw notes and media references into reviewed Naver Blog drafts.",
    purpose: "Use this Workspace to preserve the source material behind a post, prepare a consistent writing prompt, and keep the generated title, body, and keywords together until publication is complete.",
    responsibilities: ["Keep the original memo separate from generated copy", "Record photo and File Browser paths without giving Admin filesystem access", "Generate a reusable ChatGPT writing prompt from saved inputs", "Review facts, tone, title, body, and keywords before publishing"],
    workflow: ["Save the original memo and media paths", "Copy the generated ChatGPT prompt", "Paste the generated title, body, and keywords", "Review and revise the result in Admin", "Publish manually and mark the Task DONE"],
    taskGuidance: "Create one Blog Task per post or meaningful content revision. References can link research, source pages, and `/files/blog/...` media paths.",
  },
  youtube: {
    summary: "Planning space for video ideas, research, outlines, production checkpoints, and future publishing automation.",
    purpose: "Use this Workspace to organize video work before dedicated YouTube automation is introduced. The common Task model currently holds the brief, references, results, deadlines, and artifacts without calling an external API.",
    responsibilities: ["Capture video ideas and source references", "Track outlines, scripts, media preparation, and review deadlines", "Keep future automation inputs provider-neutral", "Link output artifacts by metadata path when available"],
    workflow: ["Create a Task from an idea or production need", "Add research and source links", "Prepare the expected output and due date", "Save the resulting outline or production notes", "Review and close the Task"],
    taskGuidance: "Use common Tasks for now. Specialized script, thumbnail, and publishing fields can be added after the repeated workflow is clear.",
  },
  freelancer: {
    summary: "Private delivery space for client work, requests, deadlines, references, and handoff records that do not belong to a product Workspace.",
    purpose: "Use this Workspace as a neutral client-work inbox. It keeps the request, relevant URLs, due date, working notes, and final result in Mano Admin while avoiding a premature client-specific data model.",
    responsibilities: ["Separate freelance obligations from Project A and Project T", "Record scope, context, links, and deadlines", "Keep a concise delivery result or handoff note", "Avoid storing client secrets or credentials in Task text"],
    workflow: ["Capture the request and expected deliverable", "Add references and a realistic due date", "Move READY work into IN_PROGRESS", "Save the result and perform a manual review", "Complete the handoff and mark DONE"],
    taskGuidance: "Use common Tasks for client deliverables, research, meetings, follow-ups, and administrative work. Create a dedicated Workspace later only if a client develops a stable repeated workflow.",
  },
};
