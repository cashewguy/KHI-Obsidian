
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	FuzzySuggestModal
} from "obsidian";

// Settings interface (vault-relative clippings path)
interface KhiPluginSettings {
	highlightFolder: string;
}

const DEFAULT_SETTINGS: KhiPluginSettings = {
	highlightFolder: ""
};

// Extracted highlight format
function parseClippings(rawText: string): Map<string, { text: string; meta: string }[]> {
	rawText = rawText.replace(/^\uFEFF/, '');
	const highlightsMap = new Map<string, { text: string; meta: string }[]>();
	const entries = rawText.split(/==========\r?\n?/);
	for (const entry of entries) {
		const lines = entry.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
		if (lines.length < 3) continue;
		const titleLine = lines[0].trim();
		const metaLine = lines[1].trim();
		const textLines = lines.slice(2).join(' ').trim();
		if (!titleLine || titleLine.length < 3 || !textLines) continue;
		if (!highlightsMap.has(titleLine)) highlightsMap.set(titleLine, []);
		highlightsMap.get(titleLine)?.push({ text: textLines, meta: metaLine });
	}
	return highlightsMap;
}

// Modal for fuzzy book title selection
class BookTitleFuzzyModal extends FuzzySuggestModal<string> {
	plugin: KindleHighlightImporterPlugin;
	items: string[];
	onSelect: (title: string) => void;

	constructor(app: App, plugin: KindleHighlightImporterPlugin, titles: string[], onSelect: (title: string) => void) {
		super(app);
		this.plugin = plugin;
		this.items = titles;
		this.onSelect = onSelect;
	}

	getItems(): string[] {
		return this.items;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(item);
	}
}

export default class KindleHighlightImporterPlugin extends Plugin {
	settings: KhiPluginSettings;

	async onload() {
		console.log("Kindle Selective Highlight Importer loaded");

		await this.loadSettings();

		this.addSettingTab(new KhiPluginSettingTab(this.app, this));

		this.addCommand({
			id: "import-kindle-highlights",
			name: "Import Kindle Highlights for Book",
			callback: async () => {
				const fileExists = await this.app.vault.adapter.exists(this.settings.highlightFolder);
				if (!fileExists) {
					new Notice("My Clippings.txt not found. Please check the path in settings.");
					return;
				}

				const rawText = await this.app.vault.adapter.read(this.settings.highlightFolder);
				const highlightMap = parseClippings(rawText);
				const titles = Array.from(highlightMap.keys()).filter(t => t.trim().length > 0);

				new BookTitleFuzzyModal(this.app, this, titles, async (selectedTitle) => {
					const highlights = highlightMap.get(selectedTitle);
					if (!highlights || highlights.length === 0) {
						new Notice("No highlights found for that title.");
						return;
					}

					const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView) {
						const editor = activeView.editor;
editor.replaceSelection(
	`## Kindle Highlights: ${selectedTitle}\n\n` +
	highlights.map(hl => `> ${hl.text}\n>\n> ${hl.meta}`).join("\n\n")
);
						new Notice(`Imported ${highlights.length} highlights from "${selectedTitle}".`);
					} else {
						new Notice("No active markdown editor.");
					}
				}).open();
			}
		});
	}

	onunload() {
		console.log("Kindle Selective Highlight Importer unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class KhiPluginSettingTab extends PluginSettingTab {
	plugin: KindleHighlightImporterPlugin;

	constructor(app: App, plugin: KindleHighlightImporterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Kindle Highlight Importer Settings" });

		new Setting(containerEl)
			.setName("My Clippings.txt path")
			.setDesc("Vault-relative path to My Clippings.txt (e.g., Clippings/My Clippings.txt). Must be inside your Obsidian vault.")
			.addText(text => text
				.setPlaceholder("Clippings/My Clippings.txt")
				.setValue(this.plugin.settings.highlightFolder)
				.onChange(async (value) => {
					this.plugin.settings.highlightFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
