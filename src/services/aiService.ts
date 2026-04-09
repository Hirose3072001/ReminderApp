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
  parseCommand: async (text: string, retries = 3, delayMs = 1500): Promise<ParsedCommand> => {
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

    let attempt = 0;
    while (attempt < retries) {
      try {
        const model = genAI.getGenerativeModel(
          { 
            model: "gemini-2.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
          }
        );

        const now = new Date();
        const localTimeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        const prompt = `
          Bạn là một trợ lý quản lý lịch trình thông minh.
          Hãy phân tích câu lệnh tiếng Việt sau và trả về định dạng JSON duy nhất.
          
          Câu lệnh: "${text}"
          Thời gian hiện tại (Local GMT+7): ${localTimeStr}
          
          Quy tắc xử lý (RẤT QUAN TRỌNG):
          1. "action": "create" nếu người dùng muốn tạo mới, thêm lịch, hoặc mô tả một sự kiện/công việc kèm thời gian. Nếu không liên quan đến lịch trình, trả về "unknown".
          2. "type": "task" nếu là công việc cần làm, "event" nếu là sự kiện/lịch họp/hội nghị/hẹn hò.
          3. "isDeadline": true nếu có từ khóa "hạn", "deadline", "trước lúc", "xong trước". 
          4. "startDateTime" và "endDateTime": Chuyển đổi sang ISO 8601 string (+07:00).
             - Nếu là sự kiện diễn ra vào một ngày cụ thể ("ngày 11 tháng này"): Dựa vào thời gian hiện tại (${localTimeStr}) để tính toán chính xác ngày tháng năm.
             - Nếu người dùng không nói giờ cụ thể, mặc định "startDateTime" là 09:00:00+07:00 của ngày đó.
             - Nếu là "event", "endDateTime" mặc định sau "startDateTime" 1 giờ nếu không có thông tin kết thúc.
             - Nếu là "task" có hạn, "endDateTime" là thời điểm hạn chót, "startDateTime" là ${now.toISOString()}.
          5. "subtasks": Danh sách các bước thực hiện nếu người dùng có nhắc đến (ví dụ: "chuẩn bị tài liệu, đặt phòng").
          6. "title": Tiêu đề ngắn gọn, viết hoa chữ cái đầu. Loại bỏ các từ thời gian và từ khóa hành động (tạo, thêm...).
          
          JSON Schema:
          {
            "action": "create" | "unknown",
            "type": "task" | "event",
            "title": "tên sự kiện/công việc",
            "startDateTime": "YYYY-MM-DDTHH:mm:ss+07:00",
            "endDateTime": "YYYY-MM-DDTHH:mm:ss+07:00",
            "isDeadline": boolean,
            "subtasks": string[]
          }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText) as ParsedCommand;

      } catch (error: any) {
        attempt++;
        console.warn(`⚠️ Gemini Parsing Attempt ${attempt} failed:`, error?.message || 'Unknown error');
        
        if (attempt >= retries) {
          console.error('❌ Gemini Parsing Final Error: API repeatedly failed to generate content.');
          return { 
            action: 'unknown', 
            type: 'task', 
            title: '', 
            startDateTime: new Date().toISOString(),
            endDateTime: new Date().toISOString(),
            subtasks: []
          };
        }
        
        // Wait before retrying (exponential backoff)
        console.log(`⏳ Waiting ${delayMs * attempt}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    return { action: 'unknown', type: 'task', title: '', startDateTime: new Date().toISOString(), endDateTime: new Date().toISOString() };
  }
};
