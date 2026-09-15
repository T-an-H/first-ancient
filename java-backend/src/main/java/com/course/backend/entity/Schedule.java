package com.course.backend.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 排课
 */
@Data
@TableName("schedule")
public class Schedule {

    @TableId(type = IdType.INPUT)
    private String id;

    private String courseId;

    private String title;

    /** 周几（周一~周日） */
    private String day;

    /**
     * 上课班级
     *
     * ⚠️ 未同步「空 = 全班级」语义：本 Java 服务的 GET /api/schedules 没有按班级过滤
     * （连 class 查询参数都不接收），与 Express 主后端行为不一致。
     * 当前部署走 Express（见 更新公告与共创者上传教程/部署过程.md），
     * 若日后前端 API 指向本服务，按班级取排课会静默失效。
     */
    private String className;

    private LocalDate startDate;

    private LocalDate endDate;

    /** 时间段，如 8:00-9:40 */
    private String timeSlot;

    /** 教室 */
    private String room;

    /** 授课教师 */
    private String teacher;

    /** 企业导师 */
    private String mentor;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
