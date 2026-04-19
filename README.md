# M-Task | Kanban Task Manager (Vanilla JS)

M-Task la ung dung quan ly cong viec theo mo hinh Kanban, xay dung bang HTML/CSS/JavaScript thuan, khong phu thuoc framework.

Du an tap trung vao:

- Quan ly state ro rang tren client
- Kha nang mo rong tinh nang (CRUD, drag-drop, import/export)
- Trai nghiem nguoi dung truc quan, de su dung

## Demo Features

- Kanban 3 cot: To Do, Doing, Done
- Drag-and-drop task giua cac cot voi SortableJS
- Them task theo cot bang nut + va modal popup
- Chinh sua task khi hover vao card
- Nut hoan thanh tren card: day task sang cot ke ben
- Duplicate task chi o cot To Do
- Loc task theo tu khoa va do uu tien
- Mo ta task rich text:
  - Bold, Italic, Underline
  - Bullet list, Numbered list
- Quan ly thoi gian bat dau/ket thuc theo datetime
- Gan mau task bang color palette
- Export/Import JSON
- Luu du lieu vao localStorage
- Ho tro dark mode

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES Modules)
- SortableJS (CDN)
- localStorage API

## Kien Truc Thu Muc

```text
M-Task/
	index.html
	README.md
	css/
		style.css
	js/
		main.js      # Dieu khien state, event, modal, business logic
		render.js    # Render board/column/card theo state
		storage.js   # normalize/sanitize data, localStorage
		dragdrop.js  # Khoi tao va huy Sortable instances
```

## Data Model Task

Moi task duoc luu voi cau truc:

```json
{
  "id": "task-...",
  "title": "Task title",
  "descriptionHtml": "<p>Mo ta co dinh dang</p>",
  "startAt": "2026-04-19T08:00:00.000Z",
  "endAt": "2026-04-19T09:00:00.000Z",
  "priority": "high|medium|low",
  "color": "#0f766e",
  "createdAt": 1713511000000,
  "updatedAt": 1713511000000
}
```

## Cach Chay Du An

1. Clone repo:

```bash
git clone https://github.com/twngvi/M-Task.git
```

2. Mo thu muc du an trong VS Code.
3. Chay bang Live Server hoac mo truc tiep file index.html tren trinh duyet.

## Gia Tri CV / Portfolio

Du an phu hop de demo cac ky nang:

- Tu duy thiet ke state-driven UI
- Tach module ro rang (render, storage, interaction)
- Xu ly compatibility du lieu cu/moi (normalization)
- Toi uu UX: hover actions, modal form, visual hierarchy cho time-range
- Secure frontend co ban: sanitize rich text truoc khi render

Co the dua vao CV theo mau:

```text
M-Task - Kanban Task Manager (Vanilla JS)
- Built a modular Kanban app using pure JavaScript with drag-and-drop workflows.
- Implemented rich task editor (formatting, scheduling, color coding) with local persistence.
- Added JSON import/export and backward-compatible data normalization strategy.
```

## Huong Nang Cap Tiep Theo

- Tim kiem nang cao theo khoang thoi gian
- Reminder va canh bao task qua han
- Undo/Redo
- Unit test cho cac ham normalize/sanitize
- Dong bo cloud (Firebase/Supabase)

## License

MIT
