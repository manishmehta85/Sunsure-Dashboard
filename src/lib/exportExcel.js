import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export async function exportToExcel() {
  // Fetch ALL data including updates
  const [
    { data: projects },
    { data: tasks },
    { data: updates }
  ] = await Promise.all([
    supabase.from('projects').select('*').order('name'),
    supabase.from('tasks').select('*').order('project_id'),
    supabase.from('task_updates').select('*').order('created_at', { ascending: true }),
  ]);

  if (!projects || !tasks) throw new Error('Failed to fetch data');

  const projMap = {};
  projects.forEach(p => { projMap[p.id] = p; });

  const updateMap = {};
  (updates || []).forEach(u => {
    if (!updateMap[u.task_id]) updateMap[u.task_id] = [];
    updateMap[u.task_id].push(u);
  });

  const today = new Date().toISOString().split('T')[0];
  const fmtDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' }); }
    catch { return d; }
  };

  const wb = XLSX.utils.book_new();

  // ── SHEET 1: SUMMARY ──────────────────────────────────────
  const projStats = {};
  tasks.forEach(t => {
    if (!projStats[t.project_id]) projStats[t.project_id] = { total:0, completed:0, inprogress:0, onhold:0, overdue:0 };
    const s = projStats[t.project_id];
    s.total++;
    if (t.status === 'Completed')   s.completed++;
    if (t.status === 'In Progress') s.inprogress++;
    if (t.status === 'On Hold')     s.onhold++;
    if (t.status !== 'Completed' && t.target_date && t.target_date < today) s.overdue++;
  });

  const s1 = [
    ['SunSure Energy — Project Task Dashboard'],
    [`Generated: ${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`],
    [],
    ['#', 'Project Name', 'State', 'Capacity', 'Total Tasks', 'Completed', 'In Progress', 'On Hold', 'Overdue', 'Completion %'],
    ...projects.map((p, i) => {
      const s = projStats[p.id] || { total:0, completed:0, inprogress:0, onhold:0, overdue:0 };
      const pct = s.total ? Math.round(s.completed / s.total * 100) : 0;
      return [i+1, p.name, p.state||'', p.capacity||'', s.total, s.completed, s.inprogress, s.onhold, s.overdue, `${pct}%`];
    }),
    [],
    ['', 'TOTAL', '', '',
      tasks.length,
      tasks.filter(t=>t.status==='Completed').length,
      tasks.filter(t=>t.status==='In Progress').length,
      tasks.filter(t=>t.status==='On Hold').length,
      tasks.filter(t=>t.status!=='Completed'&&t.target_date&&t.target_date<today).length,
      `${tasks.length ? Math.round(tasks.filter(t=>t.status==='Completed').length/tasks.length*100) : 0}%`
    ]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{wch:5},{wch:38},{wch:16},{wch:12},{wch:13},{wch:13},{wch:13},{wch:11},{wch:11},{wch:14}];
  ws1['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:9} }, { s:{r:1,c:0}, e:{r:1,c:9} }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // ── SHEET 2: ALL TASKS ────────────────────────────────────
  const s2 = [
    ['#','Project','State','Task Description','Responsible','Priority','Status',
     'Target Date','Revised Date','Completed On','Days Overdue','Latest Update Remark'],
    ...tasks.map((t, i) => {
      const proj = projMap[t.project_id] || {};
      const isOd = t.status !== 'Completed' && t.target_date && t.target_date < today;
      const daysOd = isOd ? Math.round((new Date() - new Date(t.target_date)) / 86400000) : '';
      const taskUpdates = updateMap[t.id] || [];
      const latestUpdate = taskUpdates.length > 0 ? taskUpdates[taskUpdates.length - 1].remark : '';
      return [
        i+1, proj.name||'', proj.state||'', t.title||'',
        t.responsible||'', t.priority||'', t.status||'',
        fmtDate(t.target_date), fmtDate(t.revised_date), fmtDate(t.completed_on),
        daysOd, latestUpdate.slice(0,500)
      ];
    })
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols'] = [{wch:5},{wch:30},{wch:14},{wch:55},{wch:18},{wch:10},{wch:14},{wch:12},{wch:12},{wch:12},{wch:13},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws2, 'All Tasks');

  // ── SHEET 3: OVERDUE TASKS ────────────────────────────────
  const overdueTasks = tasks
    .filter(t => t.status !== 'Completed' && t.target_date && t.target_date < today)
    .sort((a,b) => a.target_date > b.target_date ? 1 : -1);

  const s3 = [
    ['#','Project','Task Description','Responsible','Target Date','Days Overdue','Status','Latest Update'],
    ...overdueTasks.map((t, i) => {
      const proj = projMap[t.project_id] || {};
      const daysOd = Math.round((new Date() - new Date(t.target_date)) / 86400000);
      const taskUpdates = updateMap[t.id] || [];
      const latestUpdate = taskUpdates.length > 0 ? taskUpdates[taskUpdates.length - 1].remark : '';
      return [
        i+1, proj.name||'', t.title||'', t.responsible||'',
        fmtDate(t.target_date), daysOd, t.status||'', latestUpdate.slice(0,500)
      ];
    })
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3['!cols'] = [{wch:5},{wch:30},{wch:55},{wch:18},{wch:12},{wch:14},{wch:14},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Overdue Tasks');

  // ── SHEET 4: UPDATE HISTORY (ALL UPDATES PER TASK) ────────
  const s4rows = [
    ['#','Project','Task Description','Responsible','Status','Update Date','Updated By','Update Remark']
  ];

  let entryNum = 1;
  tasks.forEach(t => {
    const proj = projMap[t.project_id] || {};
    const taskUpdates = updateMap[t.id] || [];
    if (taskUpdates.length === 0) return;
    taskUpdates.forEach(u => {
      s4rows.push([
        entryNum++,
        proj.name || '',
        (t.title || '').slice(0, 100),
        t.responsible || '',
        t.status || '',
        u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN',
          { day:'2-digit', month:'short', year:'2-digit' }) : '',
        u.updated_by || '',
        (u.remark || '').slice(0, 600)
      ]);
    });
  });

  const ws4 = XLSX.utils.aoa_to_sheet(s4rows);
  ws4['!cols'] = [{wch:6},{wch:30},{wch:60},{wch:18},{wch:14},{wch:12},{wch:14},{wch:80}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Update History');

  // ── SHEET 5: TASK-WISE HISTORY SUMMARY ───────────────────
  // One row per task showing all updates in a single cell
  const s5rows = [
    ['#','Project','Task Description','Responsible','Status','Target Date','No. of Updates','Full Update History']
  ];

  tasks.forEach((t, i) => {
    const proj = projMap[t.project_id] || {};
    const taskUpdates = updateMap[t.id] || [];
    const historyText = taskUpdates.map((u, idx) => {
      const d = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN',
        { day:'2-digit', month:'short', year:'2-digit' }) : '';
      return `[${d}] ${u.remark}`;
    }).join('\n\n');

    s5rows.push([
      i+1,
      proj.name || '',
      (t.title || '').slice(0, 100),
      t.responsible || '',
      t.status || '',
      fmtDate(t.target_date),
      taskUpdates.length,
      historyText.slice(0, 2000)
    ]);
  });

  const ws5 = XLSX.utils.aoa_to_sheet(s5rows);
  ws5['!cols'] = [{wch:5},{wch:30},{wch:55},{wch:18},{wch:14},{wch:12},{wch:13},{wch:100}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Task History Summary');

  // ── Download ──────────────────────────────────────────────
  const date = new Date().toLocaleDateString('en-IN',
    { day:'2-digit', month:'short', year:'numeric' }).replace(/ /g, '-');
  const fileName = `SunSure_Projects_${date}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
