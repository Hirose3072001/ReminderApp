import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedCommand {
  action: 'create' | 'unknown';
  type: 'event' | 'task';
  title: string;
  startDateTime: string;
  endDateTime: string;
  isDeadline?: boolean; // True nếu người dùng nói về hạn chót (deadline)
  subtasks?: string[];
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Dịch vụ xử lý ngôn ngữ tự nhiên cho trợ lý AI.
 * Chỉ sử dụng Google Gemini để đảm bảo độ chính xác cao nhất.
 */
export const aiService = {
  /**
   * Phân tích câu lệnh của người dùng bằng AI (Gemini)
   */
  parseCommand: async (text: string): Promise<ParsedCommand> => {
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API Key missing.');
      return { 
        action: 'unknown', 
        type: 'task', 
        title: '', 
        startDateTime: new Date().toISOString(),
        endDateTime: new Date().toISOString() 
      };
    }

    try {
      const model = genAI.getGenerativeModel(
        { 
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        },
        { apiVersion: "v1beta" }
      );

      const now = new Date();
      const localTimeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      const prompt = `
        Bạn là một trợ lý quản lý lịch trình thông minh.
        Hãy phân tích câu lệnh tiếng Việt sau và trả về định dạng JSON duy nhất.
        
        Câu lệnh: "${text}"
        Thời gian hiện tại (Local GMT+7): ${localTimeStr}
        
        Quy tắc xử lý thời gian (RẤT QUAN TRỌNG):
        1. "type": "task" nếu là công việc cần làm, "event" nếu là sự kiện/lịch họp.
        2. "isDeadline": true nếu có từ khóa "hạn", "deadline", "trước lúc", "xong trước". Mặc định false cho event.
        3. "startDateTime" và "endDateTime": Chuyển đổi sang ISO 8601 string (+07:00).
           - Nếu là Công việc (task) và có "hạn": 
             + "endDateTime" là thời gian hạn chót người dùng nói. 
             + "startDateTime" PHẢI LÀ thời gian hiện tại (${now.toISOString()}).
           - Nếu là Công việc (task) nhưng KHÔNG có hạn/deadline:
             + Cả "startDateTime" và "endDateTime" đều là thời gian người dùng nói.
           - Nếu là Sự kiện (event):
             + "startDateTime" là thời gian bắt đầu người dùng nói.
             + Nếu người dùng không nói giờ kết thúc, "endDateTime" = "startDateTime" + 1 giờ.
           - Nếu không có giờ nói đến, mặc định 09:00:00+07:00.
        4. "action": "create" nếu người dùng muốn tạo mới, "unknown" nếu khác.
        5. "subtasks": Danh sách các nhiệm vụ con (nếu có).
        6. "title": Tiêu đề ngắn gọn, viết hoa chữ cái đầu. Loại bỏ các từ khóa thời gian và từ "hạn", "deadline".
        
        JSON Schema:
        {
          "action": "create" | "unknown",
          "type": "task" | "event",
          "title": "tên sự kiện/công việc",
          "startDateTime": "YYYY-MM-DDTHH:mm:ss+07:00",
          "endDateTime": "YYYY-MM-DDTHH:mm:ss+07:00",
          "isDeadline": boolean,
          "subtasks": ["nhiệm vụ 1", "nhiệm vụ 2"]
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText) as ParsedCommand;
    } catch (error) {
      console.error('❌ Gemini Parsing Error:', error);
      return { 
        action: 'unknown', 
        type: 'task', 
        title: '', 
        startDateTime: new Date().toISOString(),
        endDateTime: new Date().toISOString(),
        subtasks: []
      };
    }
  }
};
