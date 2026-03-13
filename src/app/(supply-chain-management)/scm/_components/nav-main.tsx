// src/app/(financial-management)/fm/_components/nav-main.tsx
"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function normalizePath(p: string) {
  if (!p) return "/";
  if (p !== "/" && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function isRouteActiveExact(currentPath: string, targetUrl: string) {
  if (!targetUrl || targetUrl === "#") return false;
  const cur = normalizePath(currentPath);
  const tgt = normalizePath(targetUrl);
  return cur === tgt;
}

type NavNode = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavNode[];
};

function hasActiveInTree(pathname: string, node?: NavNode): boolean {
  if (!node) return false;
  if (isRouteActiveExact(pathname, node.url)) return true;
  return node.items?.some((c) => hasActiveInTree(pathname, c)) ?? false;
}

const SUB_L2 =
  "relative w-full overflow-x-hidden " +
  "mx-0 px-0 translate-x-0 border-l-0 " +
  "before:content-none " +
  "after:content-[''] after:absolute after:left-6 after:top-0 after:bottom-0 after:w-px after:bg-border/70";

const SUB_L3 =
  "relative w-full overflow-x-hidden " +
  "mx-0 px-0 translate-x-0 border-l-0 " +
  "before:content-none " +
  "after:content-[''] after:absolute after:left-12 after:top-0 after:bottom-0 after:w-px after:bg-border/70";

const SUB_L4 =
  "relative w-full overflow-x-hidden " +
  "mx-0 px-0 translate-x-0 border-l-0 " +
  "before:content-none " +
  "after:content-[''] after:absolute after:left-18 after:top-0 after:bottom-0 after:w-px after:bg-border/70";

const SUBBTN_CLEAR_ROW_HOVER =
  "hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent";

function LabelFixed({
  text,
  active,
  className,
}: {
  text: string;
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center truncate rounded-md px-3 py-1 transition-colors",
        "group-hover/row:bg-sidebar-accent group-hover/row:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
        className,
      )}
      title={text}
    >
      {text}
    </span>
  );
}

export function NavMain({ items }: { items: NavNode[] }) {
  const pathnameRaw = usePathname() || "/";
  const pathname = normalizePath(pathnameRaw);

  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};

    for (const item of items) {
      if (item.items?.length) {
        initial[item.title] =
          hasActiveInTree(pathname, item) || !!item.isActive;
      }

      for (const sub of item.items ?? []) {
        if (sub.items?.length) {
          const key = `${item.title}::${sub.title}`;
          initial[key] = hasActiveInTree(pathname, sub) || !!sub.isActive;

          for (const third of sub.items ?? []) {
            if (third.items?.length) {
              const thirdKey = `${key}::${third.title}`;
              initial[thirdKey] =
                hasActiveInTree(pathname, third) || !!third.isActive;
            }
          }
        }
      }
    }

    return initial;
  });

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    setOpenMap((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const item of items) {
        if (item.items?.length) {
          const shouldOpenParent = hasActiveInTree(pathname, item);
          if (shouldOpenParent && !next[item.title]) {
            next[item.title] = true;
            changed = true;
          }
        }

        for (const sub of item.items ?? []) {
          if (sub.items?.length) {
            const key = `${item.title}::${sub.title}`;
            const shouldOpenSub = hasActiveInTree(pathname, sub);
            if (shouldOpenSub && !next[key]) {
              next[key] = true;
              changed = true;
            }

            for (const third of sub.items ?? []) {
              if (third.items?.length) {
                const thirdKey = `${key}::${third.title}`;
                const shouldOpenThird = hasActiveInTree(pathname, third);
                if (shouldOpenThird && !next[thirdKey]) {
                  next[thirdKey] = true;
                  changed = true;
                }
              }
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [pathname, items]);

  if (!mounted) return null;

  return (
    <SidebarGroup className="overflow-x-hidden">
      <SidebarMenu className="overflow-x-hidden">
        {items.map((item) => {
          const hasChildren = !!item.items?.length;
          const isClickableLink = item.url !== "#";

          const itemActive = isRouteActiveExact(pathname, item.url);
          const parentHighlighted = itemActive;

          const isOpen = hasChildren ? !!openMap[item.title] : false;

          return (
            <Collapsible
              key={item.title}
              asChild
              open={hasChildren ? isOpen : undefined}
              onOpenChange={
                hasChildren
                  ? (v) => setOpenMap((prev) => ({ ...prev, [item.title]: v }))
                  : undefined
              }
            >
              <SidebarMenuItem>
                {/* LEVEL 1 */}
                {hasChildren ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "cursor-pointer",
                        parentHighlighted &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      {item.icon ? <item.icon /> : null}
                      <span className="truncate">{item.title}</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={cn(
                      "cursor-pointer",
                      itemActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    {isClickableLink ? (
                      <Link href={item.url}>
                        {item.icon ? <item.icon /> : null}
                        <span className="truncate">{item.title}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.icon ? <item.icon /> : null}
                        <span className="truncate">{item.title}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                )}

                {hasChildren ? (
                  <>
                    {/* LEVEL 1 CHEVRON */}
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="cursor-pointer transition-transform data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {/* LEVEL 2 WRAPPER */}
                      <SidebarMenuSub className={SUB_L2}>
                        {item.items!.map((subItem) => {
                          const subHasChildren = !!subItem.items?.length;
                          const subKey = `${item.title}::${subItem.title}`;
                          const subOpen = subHasChildren
                            ? !!openMap[subKey]
                            : false;
                          const subActive = isRouteActiveExact(
                            pathname,
                            subItem.url,
                          );

                          // LEVEL 2 LEAF (✅ now same right edge as other level-2 rows)
                          if (!subHasChildren) {
                            return (
                              <SidebarMenuSubItem
                                key={subItem.title}
                                className="min-w-0"
                              >
                                <SidebarMenuSubButton
                                  asChild
                                  className={cn(
                                    "w-full min-w-0 cursor-pointer !pl-9",
                                    SUBBTN_CLEAR_ROW_HOVER,
                                  )}
                                >
                                  {subItem.url === "#" ? (
                                    <div className="min-w-0">
                                      <div className="group/row inline-flex min-w-0">
                                        <LabelFixed
                                          text={subItem.title}
                                          active={subActive}
                                          className="min-w-[calc(11rem+24px)]"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <Link
                                      href={subItem.url}
                                      className="min-w-0"
                                    >
                                      <div className="group/row inline-flex min-w-0">
                                        <LabelFixed
                                          text={subItem.title}
                                          active={subActive}
                                          className="min-w-[calc(11rem+24px)]"
                                        />
                                      </div>
                                    </Link>
                                  )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          }

                          // LEVEL 2 COLLAPSIBLE
                          return (
                            <Collapsible
                              key={subItem.title}
                              asChild
                              open={subOpen}
                              onOpenChange={(v) =>
                                setOpenMap((prev) => ({ ...prev, [subKey]: v }))
                              }
                            >
                              <SidebarMenuSubItem className="min-w-0">
                                {/* Label trigger */}
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton
                                    className={cn(
                                      "w-full min-w-0 cursor-pointer !pl-9",
                                      SUBBTN_CLEAR_ROW_HOVER,
                                    )}
                                  >
                                    <div className="group/row inline-flex min-w-0">
                                      <LabelFixed
                                        text={subItem.title}
                                        active={subActive}
                                        className="min-w-[calc(11rem+24px)]"
                                      />
                                    </div>
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>

                                {/* Chevron trigger */}
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuAction className="cursor-pointer transition-transform data-[state=open]:rotate-90">
                                    <ChevronRight />
                                    <span className="sr-only">Toggle</span>
                                  </SidebarMenuAction>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  {/* LEVEL 3 WRAPPER */}
                                  <SidebarMenuSub className={SUB_L3}>
                                    {subItem.items!.map((third) => {
                                      const thirdHasChildren =
                                        !!third.items?.length;
                                      const thirdKey = `${subKey}::${third.title}`;
                                      const thirdOpen = thirdHasChildren
                                        ? !!openMap[thirdKey]
                                        : false;
                                      const thirdActive = isRouteActiveExact(
                                        pathname,
                                        third.url,
                                      );

                                      if (!thirdHasChildren) {
                                        return (
                                          <SidebarMenuSubItem
                                            key={third.title}
                                            className="min-w-0"
                                          >
                                            <SidebarMenuSubButton
                                              asChild
                                              className={cn(
                                                "w-full min-w-0 cursor-pointer !pl-15",
                                                SUBBTN_CLEAR_ROW_HOVER,
                                              )}
                                            >
                                              {third.url === "#" ? (
                                                <div className="min-w-0">
                                                  <div className="group/row inline-flex min-w-0">
                                                    <LabelFixed
                                                      text={third.title}
                                                      active={thirdActive}
                                                      className="min-w-[11rem]"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <Link
                                                  href={third.url}
                                                  className="min-w-0"
                                                >
                                                  <div className="group/row inline-flex min-w-0">
                                                    <LabelFixed
                                                      text={third.title}
                                                      active={thirdActive}
                                                      className="min-w-[11rem]"
                                                    />
                                                  </div>
                                                </Link>
                                              )}
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        );
                                      }

                                      return (
                                        <Collapsible
                                          key={third.title}
                                          asChild
                                          open={thirdOpen}
                                          onOpenChange={(v) =>
                                            setOpenMap((prev) => ({
                                              ...prev,
                                              [thirdKey]: v,
                                            }))
                                          }
                                        >
                                          <SidebarMenuSubItem className="min-w-0">
                                            <CollapsibleTrigger asChild>
                                              <SidebarMenuSubButton
                                                className={cn(
                                                  "w-full min-w-0 cursor-pointer !pl-15",
                                                  SUBBTN_CLEAR_ROW_HOVER,
                                                )}
                                              >
                                                <div className="group/row inline-flex min-w-0">
                                                  <LabelFixed
                                                    text={third.title}
                                                    active={thirdActive}
                                                    className="min-w-[11rem]"
                                                  />
                                                </div>
                                              </SidebarMenuSubButton>
                                            </CollapsibleTrigger>

                                            <CollapsibleTrigger asChild>
                                              <SidebarMenuAction className="cursor-pointer transition-transform data-[state=open]:rotate-90">
                                                <ChevronRight />
                                                <span className="sr-only">
                                                  Toggle
                                                </span>
                                              </SidebarMenuAction>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                              <SidebarMenuSub
                                                className={SUB_L4}
                                              >
                                                {third.items!.map((fourth) => {
                                                  const fourthActive =
                                                    isRouteActiveExact(
                                                      pathname,
                                                      fourth.url,
                                                    );
                                                  return (
                                                    <SidebarMenuSubItem
                                                      key={fourth.title}
                                                      className="min-w-0"
                                                    >
                                                      <SidebarMenuSubButton
                                                        asChild
                                                        className={cn(
                                                          "w-full min-w-0 cursor-pointer !pl-21",
                                                          SUBBTN_CLEAR_ROW_HOVER,
                                                        )}
                                                      >
                                                        <Link
                                                          href={fourth.url}
                                                          className="min-w-0"
                                                        >
                                                          <div className="group/row inline-flex min-w-0">
                                                            <LabelFixed
                                                              text={
                                                                fourth.title
                                                              }
                                                              active={
                                                                fourthActive
                                                              }
                                                              className="min-w-[9rem]"
                                                            />
                                                          </div>
                                                        </Link>
                                                      </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                  );
                                                })}
                                              </SidebarMenuSub>
                                            </CollapsibleContent>
                                          </SidebarMenuSubItem>
                                        </Collapsible>
                                      );
                                    })}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuSubItem>
                            </Collapsible>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
