import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { format, parseISO } from 'date-fns';

export async function exportToExcel() {
  // Fetch all data from Supabase
  const { data: projects } = await supabase.from('projects').select('*').order('name');
  const { data: tasks }    = await supabase.from('tasks').select('*').order('project_id');
  const { data: updates }  = await supabase.from('task_updates').select('*').order('created_at');

  if (!projects || !tasks) throw new Error('Failed to fetch data');

  // Build lookup maps
  const projMap   = {};
  projects.forEach(p => { projMap[p.id] = p; });
  const updateMap = {};
  updates?.forEach(u => {
    if (!updateMap[u.task_id]) updateMap[u.task_id] = [];
    updateMap[u.task_id].push(u);
  });

  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Dashboard Summary ──────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const projStats = {};
  tasks.forEach(t => {
    if (!projStats[t.project_id]) projStats[t.project_id] = { total:0, completed:0, inprogress:0, onhold:0, overdue:0 };
    const s = projStats[t.project_id];
    s.total++;
    if (t.status === 'Completed')  s.completed++;
    if (t.status === 'In Progress') s.inprogress++;
    if (t.status === 'On Hold')    s.onhold++;
    if (t.status !== 'Completed' && t.target_date && t.target_date < today) s.overdue++;
  });

  const summaryData = [
    ['SunSure Energy — Project Task Dashboard'],
    [`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`],
    [],
    ['Project Name', 'State', 'Capacity', 'Total Tasks', 'Completed', 'In Progress', 'On Hold', 'Overdue', 'Completion %'],
    ...projects.map(p => {
      const s = projStats[p.id] || { total:0, completed:0, inprogress:0, onhold:0, overdue:0 };
      const pct = s.total ? Math.round(s.completed / s.total * 100) : 0;
      return [p.name, p.state||'', p.capacity||'', s.total, s.completed, s.inprogress, s.onhold, s.overdue, pct + '%'];
    }),
    [],
    ['TOTAL', '', '',
      tasks.length,
      tasks.filter(t=>t.status==='Completed').length,
      tasks.filter(t=>t.status==='In Progress').length,
      tasks.filter(t=>t.status==='On Hold').length,
      tasks.filter(t=>t.status!=='Completed'&&t.target_date&&t.target_date<today).length,
      tasks.length ? Math.round(tasks.filter(t=>t.status==='Completed').length/tasks.length*100)+'%' : '0%'
    ]
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);

  // Column widths for summary
  ws1['!cols'] = [
    {wch:35},{wch:15},{wch:12},{wch:12},{wch:12},{wch:12},{wch:10},{wch:10},{wch:14}
  ];

  // Style header row
  ws1['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:8} }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // ── SHEET 2: All Tasks ──────────────────────────────────────
  const taskHeaders = [
    'Sr.No', 'Project', 'State', 'Task', 'Responsible', 'Priority',
    'Status', 'Target Date', 'Revised Date', 'Completed On',
    'Days Variance', 'Latest Update'
  ];

  const taskRows = tasks.map((t, i) => {
    const proj = projMap[t.project_id] || {};
    const latestUpdate = updateMap[t.id]?.[updateMap[t.id].length - 1];
    const variance = t.target_date
      ? Math.round((new Date() - new Date(t.target_date)) / (1000*60*60*24))
      : '';

    return [
      i + 1,
      proj.name || '',
      proj.state || '',
      t.title,
      t.responsible || '',
      t.priority || '',
      t.status || '',
      t.target_date  ? format(parseISO(t.target_date),  'dd-MMM-yy') : '',
      t.revised_date ? format(parseISO(t.revised_date), 'dd-MMM-yy') : '',
      t.completed_on ? format(parseISO(t.completed_on), 'dd-MMM-yy') : '',
      t.status !== 'Completed' && t.target_date ? variance : '',
      latestUpdate ? latestUpdate.remark.slice(0, 200) : '',
    ];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows]);
  ws2['!cols'] = [
    {wch:6},{wch:30},{wch:15},{wch:50},{wch:18},{wch:10},
    {wch:14},{wch:12},{wch:12},{wch:12},{wch:14},{wch:60}
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'All Tasks');

  // ── SHEET 3: Overdue Tasks ───────────────────────────────────
  const overdueHeaders = [
    'Sr.No', 'Project', 'Task', 'Responsible', 'Target Date', 'Days Overdue', 'Status', 'Latest Update'
  ];

  const overdueRows = tasks
    .filter(t => t.status !== 'Completed' && t.target_date && t.target_date < today)
    .sort((a,b) => a.target_date > b.target_date ? 1 : -1)
    .map((t, i) => {
      const proj = projMap[t.project_id] || {};
      const daysOverdue = Math.round((new Date() - new Date(t.target_date)) / (1000*60*60*24));
      const latestUpdate = updateMap[t.id]?.[updateMap[t.id].length - 1];
      return [
        i + 1,
        proj.name || '',
        t.title,
        t.responsible || '',
        t.target_date ? format(parseISO(t.target_date), 'dd-MMM-yy') : '',
        daysOverdue,
        t.status || '',
        latestUpdate ? latestUpdate.remark.slice(0, 200) : '',
      ];
    });

  const ws3 = XLSX.utils.aoa_to_sheet([overdueHeaders, ...overdueRows]);
  ws3['!cols'] = [{wch:6},{wch:30},{wch:50},{wch:18},{wch:12},{wch:14},{wch:14},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Overdue Tasks');

  // ── SHEET 4: Update History ──────────────────────────────────
  const histHeaders = ['Project', 'Task', 'Responsible', 'Update Date', 'Updated By', 'Remark'];

  const histRows = (updates || []).map(u => {
    const task = tasks.find(t => t.id === u.task_id);
    const proj = task ? projMap[task.project_id] : null;
    return [
      proj?.name || '',
      task?.title?.slice(0, 80) || '',
      task?.responsible || '',
      u.created_at ? format(parseISO(u.created_at), 'dd-MMM-yy') : '',
      u.updated_by || '',
      u.remark || '',
    ];
  });

  const ws4 = XLSX.utils.aoa_to_sheet([histHeaders, ...histRows]);
  ws4['!cols'] = [{wch:30},{wch:50},{wch:18},{wch:12},{wch:15},{wch:80}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Update History');

  // ── Download ─────────────────────────────────────────────────
  const fileName = `SunSure_Projects_${format(new Date(), 'dd-MMM-yyyy')}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
