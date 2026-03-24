import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useProjectsStore, useDesignStore } from '../store/designStore';
import { projectsAPI } from '../utils/api';

function SavedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { projects, setProjects, deleteProject } = useProjectsStore();
  const { setCurrentPlan, setStep } = useDesignStore();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        if (response.data.success) {
          const apiProjects = Array.isArray(response.data.data) ? response.data.data : [];
          const localProjects = useProjectsStore.getState().projects || [];

          const merged = [...apiProjects];
          localProjects.forEach((localProject) => {
            const exists = merged.some(
              (apiProject) =>
                apiProject.id === localProject.id ||
                (apiProject.afterImage && localProject.afterImage && apiProject.afterImage === localProject.afterImage)
            );

            if (!exists) {
              merged.push(localProject);
            }
          });

          setProjects(merged);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [setProjects]);

  const handleLoadProject = (project) => {
    if (project.plan) {
      setCurrentPlan(project.plan);
      setStep(4);
      navigate('/results');
    } else {
      toast.error('Project plan not found');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(projectId);

      try {
        await projectsAPI.delete(projectId);
        toast.success('Project deleted');
      } catch (error) {
        toast.success('Project removed locally');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Saved Projects
          </h1>
          <p className="text-slate-600">
            Access and manage your saved interior design projects
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center">
            <div className="loading-spinner"></div>
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 text-center"
          >
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
            <p className="text-gray-600 mb-6">
              Start by creating a new design project
            </p>
            <button
              onClick={() => navigate('/design')}
              className="btn-primary"
            >
              Create First Design
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <span className="text-2xl">🎨</span>
                </div>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="text-xs text-slate-500 mb-4">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadProject(project)}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="btn-secondary flex-1 text-sm py-2"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create New Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => navigate('/design')}
            className="btn-primary inline-flex items-center gap-2"
          >
            ✨ Create New Design
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default SavedPage;
