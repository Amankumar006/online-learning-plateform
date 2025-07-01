
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, updateUserRole } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Shield, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserActionsProps {
  user: User;
  currentUserId: string | undefined;
}

export default function UserActions({ user, currentUserId }: UserActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'admin' | 'student' | null>(null);

  const isCurrentUser = user.uid === currentUserId;

  const handleRoleChangeClick = (role: 'admin' | 'student') => {
    setTargetRole(role);
    setIsAlertOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!targetRole) return;

    try {
      await updateUserRole(user.uid, targetRole);
      toast({
        title: 'Success!',
        description: `${user.name}'s role has been updated to ${targetRole}.`,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role.',
      });
    } finally {
        setIsAlertOpen(false);
        setTargetRole(null);
    }
  };
  
  const alertDescription = `This will change their permissions. Do you want to make ${user.name} a${targetRole === 'admin' ? 'n' : ''} ${targetRole}?`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isCurrentUser}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role !== 'admin' && (
            <DropdownMenuItem onClick={() => handleRoleChangeClick('admin')}>
              <Shield className="mr-2 h-4 w-4" />
              Make Admin
            </DropdownMenuItem>
          )}
          {user.role !== 'student' && (
            <DropdownMenuItem onClick={() => handleRoleChangeClick('student')}>
              <UserIcon className="mr-2 h-4 w-4" />
              Make Student
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTargetRole(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
