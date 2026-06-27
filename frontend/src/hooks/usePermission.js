import useAuth from "./useAuth";

const usePermission = () => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const can = (action) => {
    if (!isAuthenticated) return false;
    const perms = {
      "manage:sessions": isAdmin,
      "manage:teachers": isAdmin,
      "manage:classes": isAdmin,
      "delete:students": isAdmin,
      "change:student_status": isAdmin,
      "manage:holidays": isAdmin,
      "manage:settings": isAdmin,
      "manage:backup": isAdmin,
      "unlock:attendance": isAdmin,
      "add:students": true,
      "edit:students": true,
      "mark:attendance": true,
      "view:notifications": true,
    };
    return perms[action] ?? false;
  };

  return { can, isAdmin, isTeacher, user };
};

export default usePermission;
