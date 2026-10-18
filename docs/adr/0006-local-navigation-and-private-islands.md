# Include navigation in public HTML; fetch private state in its island

Remove the inherited `/nav` route: every non-plain page includes a server-rendered native dialog, opened locally without a request or history entry. Navigation layout stays server-only; its newsletter island loads session/CSRF state from private `/login` JSON after opening. This trades a little cached HTML for immediate navigation and keeps personalization/cookies outside shared-cacheable responses; menu links remain ordinary page navigation.
