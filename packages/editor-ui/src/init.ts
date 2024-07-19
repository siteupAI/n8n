import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUsersStore } from '@/stores/users.store';
import { initializeCloudHooks } from '@/hooks/register';
import { useVersionsStore } from '@/stores/versions.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRolesStore } from './stores/roles.store';
import { initDebugSession } from './api/ai';

let coreInitialized = false;
let authenticatedFeaturesInitialized = false;

/**
 * Initializes the core application stores and hooks
 * This is called once, when the first route is loaded.
 */
export async function initializeCore() {
	if (coreInitialized) {
		return;
	}

	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const versionsStore = useVersionsStore();

	await settingsStore.initialize();
	if (!settingsStore.isPreviewMode) {
		await usersStore.initialize();

		void versionsStore.checkForNewVersions();

		if (settingsStore.isCloudDeployment) {
			try {
				await initializeCloudHooks();
			} catch (e) {
				console.error('Failed to initialize cloud hooks:', e);
			}
		}
	}

	coreInitialized = true;
}

/**
 * Initializes the features of the application that require an authenticated user
 */
export async function initializeAuthenticatedFeatures() {
	if (authenticatedFeaturesInitialized) {
		return;
	}

	const usersStore = useUsersStore();
	if (!usersStore.currentUser) {
		return;
	}

	const sourceControlStore = useSourceControlStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const rolesStore = useRolesStore();

	if (sourceControlStore.isEnterpriseSourceControlEnabled) {
		await sourceControlStore.getPreferences();
	}

	if (settingsStore.isTemplatesEnabled) {
		try {
			await settingsStore.testTemplatesEndpoint();
		} catch (e) {}
	}

	if (rootStore.defaultLocale !== 'en') {
		await nodeTypesStore.getNodeTranslationHeaders();
	}

	if (settingsStore.isCloudDeployment) {
		try {
			await cloudPlanStore.initialize();
		} catch (e) {
			console.error('Failed to initialize cloud plan store:', e);
		}
	}
	await Promise.all([
		projectsStore.getMyProjects(),
		projectsStore.getPersonalProject(),
		projectsStore.getProjectsCount(),
		rolesStore.fetchRoles(),
	]);

	const payload = {
		type: 'init-error-helper',
		error: {
			description: 'SyntaxError',
			lineNumber: 6,
			message: 'Unexpected identifier [line 6]',
		},
		user: {
			firstName: 'ricardo',
		},
		node: {
			parameters: {
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode:
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\n cons a = 123\n\nreturn $input.all();",
			},
			id: 'a4c0aa5c-95b9-48f9-b5e9-8e332645e2b9',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [460, 460],
		},
	};

	try {
		await initDebugSession(rootStore.restApiContext, payload, (chunk) => {
			console.log(chunk);
		});
	} catch (e) {
		console.error('Failed to initialize debug session:', e);
	}

	authenticatedFeaturesInitialized = true;
}
