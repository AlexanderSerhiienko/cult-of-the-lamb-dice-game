type SearchParamInput = Record<string, string> | URLSearchParams;

type MockRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  refresh: () => void;
  prefetch: (href: string) => Promise<void>;
};

export const mockNavigationState = {
  pathname: "/",
  params: {} as Record<string, string>,
  searchParams: new URLSearchParams(),
  router: {
    push: (href: string) => {
      void href;
    },
    replace: (href: string) => {
      void href;
    },
    back: () => undefined,
    refresh: () => undefined,
    prefetch: async (href: string) => {
      void href;
    },
  } as MockRouter,
};

export function setMockPathname(pathname: string) {
  mockNavigationState.pathname = pathname;
}

export function setMockParams(params: Record<string, string>) {
  mockNavigationState.params = params;
}

export function setMockSearchParams(searchParams: SearchParamInput) {
  mockNavigationState.searchParams =
    searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);
}

export function setMockRouter(router: Partial<MockRouter>) {
  mockNavigationState.router = {
    ...mockNavigationState.router,
    ...router,
  };
}

export function resetMockNavigation() {
  mockNavigationState.pathname = "/";
  mockNavigationState.params = {};
  mockNavigationState.searchParams = new URLSearchParams();
  mockNavigationState.router = {
    push: (href: string) => {
      void href;
    },
    replace: (href: string) => {
      void href;
    },
    back: () => undefined,
    refresh: () => undefined,
    prefetch: async (href: string) => {
      void href;
    },
  };
}
