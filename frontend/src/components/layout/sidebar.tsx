"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  GitCompare,
  Ship,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ChevronUp,
  Moon,
  Sun,
  LogOut,
  UserPen,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useUserProfile } from "@/hooks/use-user-profile";
import { toast } from "sonner";
import type { AvatarStyle } from "@/lib/user-store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const ORG_NAME =
  process.env.NEXT_PUBLIC_ORG_NAME || "Maventi Group";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    tourId: "dashboard",
    description: "View and manage all documents",
  },
  {
    href: "/upload",
    label: "Upload",
    icon: Upload,
    tourId: "upload",
    description: "Upload new freight documents",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    tourId: "analytics",
    description: "Extraction accuracy metrics",
  },
  {
    href: "/compare",
    label: "Compare",
    icon: GitCompare,
    tourId: "compare",
    description: "Side-by-side document comparison",
  },
];

function getDiceBearUrl(style: AvatarStyle, name: string, size = 80) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(name)}&size=${size}`;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  expandedWidth: number;
}

export function Sidebar({ collapsed, onToggle, expandedWidth }: SidebarProps) {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { profile, setName } = useUserProfile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarStyle, setEditAvatarStyle] = useState<AvatarStyle>("notionists");
  const [signOutOpen, setSignOutOpen] = useState(false);

  const isDark = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);

  const handleEditProfile = () => {
    setEditName(profile?.name || "");
    setEditAvatarStyle(profile?.avatarStyle || "notionists");
    setEditDialogOpen(true);
  };

  const handleSaveProfile = () => {
    const nextName = editName.trim() || "Admin User";
    setName(nextName, editAvatarStyle);
    setEditDialogOpen(false);
  };

  const handleSignOut = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      <motion.aside
        initial={false}
        layout
        animate={{ width: collapsed ? 64 : expandedWidth }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[2px_0_8px_-2px_rgba(0,0,0,0.12)] md:flex overflow-hidden"
      >
        {/* Logo + Toggle */}
        <div
          className={cn(
            "relative flex h-14 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  onClick={onToggle}
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Open sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2.5 px-1 flex-1 min-w-0">
                <Ship className="h-5 w-5 shrink-0 text-sidebar-primary" />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base font-bold tracking-tight whitespace-nowrap"
                >
                  Freight DIH
                </motion.span>
              </Link>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={onToggle}
                  >
                    <PanelLeftClose className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Collapse sidebar</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<span className="block" />}>
                  <Link
                    href={item.href}
                    data-tour={item.tourId}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {collapsed ? item.label : item.description}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Resources section */}
        <div className="border-t border-sidebar-border">
          {!collapsed && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                Resources
              </p>
            </div>
          )}
          <div className="space-y-0.5 px-2 pb-2 pt-1">
            <Tooltip>
              <TooltipTrigger render={<span className="block" />}>
                <button
                  onClick={() => toast.info("Settings coming soon")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground transition-all duration-150",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Settings className="h-[18px] w-[18px] shrink-0" />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="whitespace-nowrap"
                      >
                        Settings
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Settings" : "Application settings (coming soon)"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<span className="block" />}>
                <button
                  onClick={() => toast.info("Documentation coming soon")}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground transition-all duration-150",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <HelpCircle className="h-[18px] w-[18px] shrink-0" />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="whitespace-nowrap"
                      >
                        Documentation
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Documentation" : "Help & documentation (coming soon)"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* User Profile Footer — like Quansys */}
        <div className="border-t border-sidebar-border">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex w-full items-center gap-3 px-3 py-3 hover:bg-sidebar-accent/30 transition-colors text-left focus:outline-none" />
                }
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={getDiceBearUrl(profile?.avatarStyle || "notionists", profile?.name || "Admin User")}
                    alt={profile?.name || "Admin User"}
                  />
                  <AvatarFallback
                    className={`text-xs font-semibold text-white ${profile?.avatarColor || "bg-gradient-to-br from-violet-500 to-purple-600"}`}
                  >
                    {profile?.initials || "AU"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile?.name || "Admin User"}
                    </p>
                    <Badge
                      variant="outline"
                      className="h-4 text-[9px] font-medium px-1 border-primary/20 text-primary/70 bg-primary/5 shrink-0"
                    >
                      Admin
                    </Badge>
                  </div>
                  <p className="text-[11px] text-sidebar-foreground/40 truncate flex items-center gap-1">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {ORG_NAME}
                  </p>
                </div>
                <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/30" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={getDiceBearUrl(profile?.avatarStyle || "notionists", profile?.name || "Admin User")}
                          alt={profile?.name || "Admin User"}
                        />
                        <AvatarFallback
                          className={`text-sm font-semibold text-white ${profile?.avatarColor || "bg-gradient-to-br from-violet-500 to-purple-600"}`}
                        >
                          {profile?.initials || "AU"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{profile?.name || "Admin User"}</p>
                          <Badge
                            variant="outline"
                            className="h-4 text-[9px] font-medium px-1 border-primary/20 text-primary/70 bg-primary/5"
                          >
                            Admin
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-normal">{ORG_NAME}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEditProfile}>
                  <UserPen className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
                  {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setSignOutOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex justify-center py-3">
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button className="focus:outline-none" />
                      }
                    >
                      <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarImage
                          src={getDiceBearUrl(profile?.avatarStyle || "notionists", profile?.name || "Admin User")}
                          alt={profile?.name || "Admin User"}
                        />
                        <AvatarFallback
                          className={`text-xs font-semibold text-white ${profile?.avatarColor || "bg-gradient-to-br from-violet-500 to-purple-600"}`}
                        >
                          {profile?.initials || "AU"}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="w-56">
                      <DropdownMenuLabel>
                        <span className="font-medium">{profile?.name || "Admin User"}</span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleEditProfile}>
                        <UserPen className="mr-2 h-4 w-4" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
                        {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                        {isDark ? "Light Mode" : "Dark Mode"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setSignOutOpen(true)}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="right">{profile?.name || "Admin User"}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </motion.aside>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You’ll be signed out of this demo session. Your local UI preferences and onboarding state will be cleared."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleSignOut}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your display name. This appears in the audit trail for corrections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center">
              <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted">
                <img
                  src={getDiceBearUrl(
                    editAvatarStyle,
                    editName || profile?.name || "Admin User",
                    96
                  )}
                  alt={editName || profile?.name || "Admin User"}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Display Name</Label>
              <Input
                id="profile-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Avatar Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "notionists", label: "Classic" },
                  { id: "adventurer", label: "Illustrated" },
                  { id: "avataaars", label: "Avatar" },
                ] as Array<{ id: AvatarStyle; label: string }>).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEditAvatarStyle(opt.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      editAvatarStyle === opt.id
                        ? "border-primary/40 bg-primary/5"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Avatars are generated from your name + selected style.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
