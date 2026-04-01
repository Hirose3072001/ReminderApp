const fs = require('fs');
const path = 'c:\\Users\\minhtc\\Coding\\Remind_App\\src\\screens\\AddTaskScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Patch 5: Remove shadowing customBody in the loop
const patch5Old = /let customBody = isEvent \? 'Sắp diễn ra sự kiện' : \(isEdit \? 'Cập nhật công việc' : 'Đến giờ làm bài'\);\n\s+if \(rule\.timing === 'Trước khi kết thúc'\) \{(?:\n|.)*?\}\n/m;
const patch5New = '';

content = content.replace(patch5Old, patch5New);

fs.writeFileSync(path, content);
console.log('Successfully removed redundant customBody redefinition in AddTaskScreen.tsx');
