import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link, createRootRouteWithContext, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Menu, X, Home, ClipboardType, SquareFunction, Receipt, Table, Network } from "lucide-react";
import { useState } from "react";
function getContext() {
  const queryClient = new QueryClient();
  return {
    queryClient
  };
}
function Provider({
  children,
  queryClient
}) {
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children });
}
function Header() {
  const [isOpen, setIsOpen] = useState(false);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("header", { className: "p-4 flex items-center bg-gray-800 text-white shadow-lg", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setIsOpen(true),
          className: "p-2 hover:bg-gray-700 rounded-lg transition-colors",
          "aria-label": "Open menu",
          type: "button",
          children: /* @__PURE__ */ jsx(Menu, { size: 24 })
        }
      ),
      /* @__PURE__ */ jsx("h1", { className: "ml-4 text-xl font-semibold", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "text-4xl font-bold", children: "LOS" }) })
    ] }),
    /* @__PURE__ */ jsxs(
      "aside",
      {
        className: `fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-700", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold", children: "Navigation" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setIsOpen(false),
                className: "p-2 hover:bg-gray-800 rounded-lg transition-colors",
                "aria-label": "Close menu",
                children: /* @__PURE__ */ jsx(X, { size: 24 })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("nav", { className: "flex-1 p-4 overflow-y-auto", children: [
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(Home, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Home" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/loan/setup",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(ClipboardType, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Loan Setup" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/loan/scorecard-setup",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(SquareFunction, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Scorecard Setup" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/loan/repayment-setup",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(Receipt, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Repayment Setup" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/loan/applications/",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(Table, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Loan Applications" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/loan/applications/create",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(ClipboardType, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "New Application" })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/workflow",
                onClick: () => setIsOpen(false),
                className: "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2",
                activeProps: {
                  className: "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2"
                },
                children: [
                  /* @__PURE__ */ jsx(Network, { size: 20 }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Workflows" })
                ]
              }
            )
          ] })
        ]
      }
    )
  ] });
}
const appCss = "/los-prototype/assets/styles-D38kCByW.css";
const Route$a = createRootRouteWithContext()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: "TanStack Start Starter"
      }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Header, {}),
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$9 = () => import("./workflow-CALl1BSS.js");
const Route$9 = createFileRoute("/workflow")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./index-OZs8tknq.js");
const Route$8 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./index-BFjRV1bT.js");
const Route$7 = createFileRoute("/loan/")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./setup-B-u3B-LN.js");
const Route$6 = createFileRoute("/loan/setup")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./scorecards-BJxKXnCh.js");
const Route$5 = createFileRoute("/loan/scorecards")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./scorecard-setup-DLv2E_b8.js");
const Route$4 = createFileRoute("/loan/scorecard-setup")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./repayment-setup-ovsLF92p.js");
const Route$3 = createFileRoute("/loan/repayment-setup")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./index-BCUAEBNE.js");
const Route$2 = createFileRoute("/loan/applications/")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./create-BBm48Ckh.js");
const Route$1 = createFileRoute("/loan/applications/create")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./_applicationId-Dk7siaoS.js");
const Route = createFileRoute("/loan/applications/$applicationId")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const WorkflowRoute = Route$9.update({
  id: "/workflow",
  path: "/workflow",
  getParentRoute: () => Route$a
});
const IndexRoute = Route$8.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$a
});
const LoanIndexRoute = Route$7.update({
  id: "/loan/",
  path: "/loan/",
  getParentRoute: () => Route$a
});
const LoanSetupRoute = Route$6.update({
  id: "/loan/setup",
  path: "/loan/setup",
  getParentRoute: () => Route$a
});
const LoanScorecardsRoute = Route$5.update({
  id: "/loan/scorecards",
  path: "/loan/scorecards",
  getParentRoute: () => Route$a
});
const LoanScorecardSetupRoute = Route$4.update({
  id: "/loan/scorecard-setup",
  path: "/loan/scorecard-setup",
  getParentRoute: () => Route$a
});
const LoanRepaymentSetupRoute = Route$3.update({
  id: "/loan/repayment-setup",
  path: "/loan/repayment-setup",
  getParentRoute: () => Route$a
});
const LoanApplicationsIndexRoute = Route$2.update({
  id: "/loan/applications/",
  path: "/loan/applications/",
  getParentRoute: () => Route$a
});
const LoanApplicationsCreateRoute = Route$1.update({
  id: "/loan/applications/create",
  path: "/loan/applications/create",
  getParentRoute: () => Route$a
});
const LoanApplicationsApplicationIdRoute = Route.update({
  id: "/loan/applications/$applicationId",
  path: "/loan/applications/$applicationId",
  getParentRoute: () => Route$a
});
const rootRouteChildren = {
  IndexRoute,
  WorkflowRoute,
  LoanRepaymentSetupRoute,
  LoanScorecardSetupRoute,
  LoanScorecardsRoute,
  LoanSetupRoute,
  LoanIndexRoute,
  LoanApplicationsApplicationIdRoute,
  LoanApplicationsCreateRoute,
  LoanApplicationsIndexRoute
};
const routeTree = Route$a._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const rqContext = getContext();
  const router2 = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: "intent",
    Wrap: (props) => {
      return /* @__PURE__ */ jsx(Provider, { ...rqContext, children: props.children });
    }
  });
  setupRouterSsrQueryIntegration({ router: router2, queryClient: rqContext.queryClient });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route as R,
  router as r
};
