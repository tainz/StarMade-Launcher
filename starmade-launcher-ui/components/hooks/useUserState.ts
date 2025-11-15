import { useState, useEffect, useCallback } from 'react';
import {
    UserServiceKey,
    UserProfile,
    UserState,
    LoginOptions,
    AUTHORITY_MICROSOFT,
    UserException,
    isException,
} from '@xmcl/runtime-api';
import { useService, useServiceMutation } from './useService';

/**
 * A comprehensive hook for managing the user state of the application.
 * It fetches the initial user data, subscribes to real-time updates from the backend,
 * and provides actions for login, logout, and account switching.
 *
 * This mirrors the logic from `xmcl-keystone-ui/src/composables/user.ts`.
 */
export function useUserState() {
    const userService = useService(UserServiceKey);

    // Raw reactive state object from the backend. Used for subscriptions.
    const [userState, setUserState] = useState<UserState | undefined>(undefined);

    // Derived state for UI consumption
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Effect to fetch the initial state once
    useEffect(() => {
        setLoading(true);
        userService.getUserState().then(initialState => {
            setUserState(initialState);
            const userProfiles = Object.values(initialState.users);
            setUsers(userProfiles);
            setActiveUser(initialState.users[initialState.selectedUser] || userProfiles[0] || null);
        }).catch((e) => {
            console.error("Failed to get initial user state:", e);
            setError("Could not load user accounts.");
        }).finally(() => {
            setLoading(false);
        });
    }, [userService]);

    // === MUTATION SUBSCRIPTIONS ===
    // These hooks listen for changes pushed from the backend and keep our React state in sync.

    useServiceMutation(userState, 'userProfile', (profile: UserProfile) => {
        setUsers(currentUsers => {
            const index = currentUsers.findIndex(u => u.id === profile.id);
            if (index !== -1) {
                // Update existing user
                const newUsers = [...currentUsers];
                newUsers[index] = profile;
                return newUsers;
            }
            // Add new user
            return [...currentUsers, profile];
        });
    });

    useServiceMutation(userState, 'userProfileRemove', (userId: string) => {
        setUsers(currentUsers => currentUsers.filter(u => u.id !== userId));
        // If the removed user was the active one, select another
        setActiveUser(currentUser => {
            if (currentUser?.id === userId) {
                // This logic might need to be more robust, e.g., selecting the first user
                return null;
            }
            return currentUser;
        });
    });

    useServiceMutation(userState, 'userProfileSelect', (userId: string) => {
        // The backend has confirmed the user selection has changed
        setActiveUser(users.find(u => u.id === userId) || null);
    });

    // === ACTIONS ===
    // Functions that components can call to interact with the user service.

    const selectUser = useCallback((user: UserProfile) => {
        // Optimistically update the UI, the mutation listener will correct it if needed
        setActiveUser(user);
        userService.selectUser(user.id).catch(e => {
            console.error(`Failed to select user ${user.id}:`, e);
            // Revert optimistic update on failure if necessary
        });
    }, [userService, users]);

    const loginMicrosoft = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const options: LoginOptions = {
                username: '', // Not needed for Microsoft login flow
                authority: AUTHORITY_MICROSOFT,
                properties: {
                    mode: 'popup' // Use popup window for login
                }
            };
            const newUserProfile = await userService.login(options);
            selectUser(newUserProfile); // Select the newly logged-in user
            return newUserProfile;
        } catch (e) {
            console.error("Microsoft login failed:", e);
            if (isException(UserException, e)) {
                // Handle specific user exceptions if needed
                setError(e.exception.type || "An unknown login error occurred.");
            } else {
                setError("An unknown login error occurred.");
            }
            throw e;
        } finally {
            setLoading(false);
        }
    }, [userService, selectUser]);

    const logout = useCallback(async () => {
        if (!activeUser) return;
        setLoading(true);
        try {
            await userService.removeUser(activeUser);
            // The mutation listener will handle the state update
        } catch (e) {
            console.error(`Failed to logout user ${activeUser.id}:`, e);
            setError("Failed to log out.");
        } finally {
            setLoading(false);
        }
    }, [userService, activeUser]);

    const refreshUser = useCallback(async () => {
        if (!activeUser) return;
        setLoading(true);
        try {
            await userService.refreshUser(activeUser.id);
            // The mutation listener will handle the state update
        } catch (e) {
            console.error(`Failed to refresh user ${activeUser.id}:`, e);
            setError("Failed to refresh user session.");
        } finally {
            setLoading(false);
        }
    }, [userService, activeUser]);

    return {
        users,
        activeUser,
        loading,
        error,
        selectUser,
        loginMicrosoft,
        logout,
        refreshUser,
    };
}
