import { createContext, useContext, useState, ReactNode } from "react";

export type Profile = "user" | "organizer" | "campus";

type ProfileContextType = {
  currentProfile: Profile;
  setProfile: (profile: Profile) => void;
  hasPermission: (profile: Profile) => boolean;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Todos os perfis habilitados para demonstração
const userPermissions: Profile[] = ["user", "organizer", "campus"];

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<Profile>("user");

  const setProfile = (profile: Profile) => {
    if (hasPermission(profile)) {
      setCurrentProfile(profile);
    }
  };

  const hasPermission = (profile: Profile) => {
    return userPermissions.includes(profile);
  };

  return (
    <ProfileContext.Provider value={{ currentProfile, setProfile, hasPermission }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
