import { buildZipBlob, ZipEntryInput } from './zipBuilder';
import { PROJECT_FILES_A } from './projectFilesA';
import { PROJECT_FILES_B } from './projectFilesB';
import navalFleetHeroImgUrl from '../assets/images/naval_fleet_island_hero_1794923914170.jpg';
import deployWorkflowRaw from '../../.github/workflows/deploy.yml?raw';
import gitignoreRaw from '../../.gitignore?raw';
import vscodeLaunchRaw from '../../.vscode/launch.json?raw';
import vscodeTasksRaw from '../../.vscode/tasks.json?raw';

export async function downloadFullVSCodeProjectZip(): Promise<number> {
  const allFiles: Record<string, string> = {
    ...PROJECT_FILES_A,
    ...PROJECT_FILES_B,
    '/.github/workflows/deploy.yml': deployWorkflowRaw,
    '/.gitignore': gitignoreRaw,
    '/.vscode/launch.json': vscodeLaunchRaw,
    '/.vscode/tasks.json': vscodeTasksRaw,
  };

  const entries: ZipEntryInput[] = Object.entries(allFiles).map(
    ([absPath, content]) => ({
      path: `fleet-battle-vscode${absPath}`,
      content,
    })
  );

  try {
    const res = await fetch(navalFleetHeroImgUrl);
    if (res.ok) {
      const buf = new Uint8Array(await res.arrayBuffer());
      entries.push({
        path: 'fleet-battle-vscode/src/assets/images/naval_fleet_island_hero_1794923914170.jpg',
        content: buf,
      });
    }
  } catch {
    // fallback if offline blob fails
  }

  try {
    const bgRes = await fetch(`${import.meta.env.BASE_URL}assets/ocean_naval_bg.jpg`);
    if (bgRes.ok) {
      const bgBuf = new Uint8Array(await bgRes.arrayBuffer());
      entries.push({
        path: 'fleet-battle-vscode/public/assets/ocean_naval_bg.jpg',
        content: bgBuf,
      });
    }
  } catch {
    // fallback if offline fetch fails
  }

  const blob = buildZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fleet-battle-vscode.zip';
  a.click();
  URL.revokeObjectURL(url);
  return entries.length;
}
