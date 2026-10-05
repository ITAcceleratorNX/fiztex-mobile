import { useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { teacherWorkspaceApi } from '@shared/api/teacherWorkspaceApi';

/** Server-side search, folders and pagination for the lesson document picker. */
export function useWorkspaceLessonPicker({ query, fileType, folderId, page, folderPage }) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState(query.trim());
  const [results, setResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const [folders, setFolders] = useState(null);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersError, setFoldersError] = useState(false);
  const [folderRevision, setFolderRevision] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    setSearchLoading(true);
    setSearchError(false);
    teacherWorkspaceApi.searchLessonDocuments(token, { q: searchTerm, fileType, folderId, page })
      .then((response) => { if (active) setResults(response?.items ?? null); })
      .catch(() => { if (active) setSearchError(true); })
      .finally(() => { if (active) setSearchLoading(false); });
    return () => { active = false; };
  }, [token, searchTerm, fileType, folderId, page, searchRevision]);

  useEffect(() => {
    let active = true;
    setFoldersLoading(true);
    setFoldersError(false);
    teacherWorkspaceApi.folders(token, folderPage)
      .then((response) => { if (active) setFolders(response); })
      .catch(() => { if (active) setFoldersError(true); })
      .finally(() => { if (active) setFoldersLoading(false); });
    return () => { active = false; };
  }, [token, folderPage, folderRevision]);

  return {
    results, searchLoading, searchError, retrySearch: () => setSearchRevision((value) => value + 1),
    folders, foldersLoading, foldersError, retryFolders: () => setFolderRevision((value) => value + 1),
  };
}
