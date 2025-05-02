import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { invoke } from '@tauri-apps/api/core';

import SetupPage from './pages/SetupPage';
import MainAppPage from './pages/MainPage';
import SelectImagesForShowcase from './pages/SelectImagesForShowcase';
import EditImages from './pages/EditSelectedImages';
import SortImagesPage from './pages/SortImagesPage';
import GeneratePresentationPage from './pages/GeneratePresentationPage';
import ShowcasePreviewPage from './pages/ShowcasePreviewPage';

import { AboutSection } from './components/settings/AboutSection';
import { IndexingSection } from './components/settings/IndexingSection';
import { DataStorageSection } from './components/settings/DataStorageSection';
import { ApiTokensSection } from './components/settings/ApiTokensSection';
import { SettingsLayout } from './components/settings/SettingsLayout';

import Logger from './utils/log';

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <svg className="animate-spin h-10 w-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const settingsSections = [
  { id: 'about', path: 'about', component: AboutSection },
  { id: 'indexing', path: 'indexing', component: IndexingSection },
  { id: 'storage', path: 'storage', component: DataStorageSection },
  { id: 'api', path: 'api', component: ApiTokensSection },
];

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    const checkConfiguration = async () => {
      const isSetupComplete = await invoke('is_setup_complete');
      setIsLoading(true);
      try {
        if (isSetupComplete) {
          Logger.info("Configuration found.");
          setIsConfigured(true);
        } else {
          Logger.warn("Configuration missing or invalid. Redirecting to setup.");
          setIsConfigured(false);
        }
      } catch (error) {
        Logger.error("Error checking configuration:", error);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfiguration();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {isConfigured ? (
        <>
          <Route path="/" element={<MainAppPage />} />
          <Route path="/setup" element={<Navigate to="/" replace />} />
          <Route path="/select_images" element={<SelectImagesForShowcase />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="about" replace />} />
            {settingsSections.map(section => (
              <Route key={section.id} path={section.path} element={<section.component />} />
            ))}
          </Route>
          <Route path="/edit_images" element={<EditImages />} />
          <Route path="/sort_images" element={<SortImagesPage />} />
          <Route path="/generate" element={<GeneratePresentationPage />} />
          <Route path="/preview" element={<ShowcasePreviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </>
      )}
    </Routes>
  );
};

export default App;