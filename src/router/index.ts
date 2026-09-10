import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/pages/Login.vue'),
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('@/pages/ChangePassword.vue'),
    },
    {
      path: '/change-password-inapp',
      name: 'ChangePasswordInApp',
      component: () => import('@/pages/ChangePasswordInApp.vue'),
    },
    {
      path: '/admin',
      component: Layout,
      children: [
        {
          path: '',
          name: 'AdminDeptSelect',
          component: () => import('@/pages/admin/DepartmentSelect.vue'),
        },
        {
          path: 'categories',
          name: 'AdminCategories',
          component: () => import('@/pages/admin/Categories.vue'),
        },
        {
          path: 'schedules',
          name: 'AdminSchedules',
          component: () => import('@/pages/admin/Schedules.vue'),
        },
        {
          path: 'students',
          name: 'AdminStudents',
          component: () => import('@/pages/admin/Students.vue'),
        },
        {
          path: 'teachers',
          name: 'AdminTeachers',
          component: () => import('@/pages/admin/Teachers.vue'),
        },
        {
          path: 'accounts',
          name: 'AdminAccounts',
          component: () => import('@/pages/admin/Accounts.vue'),
        },
        {
          path: 'students/:id',
          name: 'AdminStudentDetail',
          component: () => import('@/pages/admin/StudentDetail.vue'),
        },
        {
          path: 'profile',
          name: 'AdminProfile',
          component: () => import('@/pages/Profile.vue'),
        },
      ],
    },
    {
      path: '/teacher',
      component: Layout,
      redirect: '/',
      children: [
        {
          path: 'courses',
          name: 'TeacherCourses',
          component: () => import('@/pages/teacher/Courses.vue'),
        },
        {
          path: 'courses/:id',
          name: 'TeacherCourseDetail',
          component: () => import('@/pages/teacher/CourseDetail.vue'),
        },
        {
          path: 'students',
          name: 'TeacherStudents',
          component: () => import('@/pages/teacher/Students.vue'),
        },
        {
          path: 'schedule',
          name: 'TeacherSchedule',
          component: () => import('@/pages/teacher/Schedule.vue'),
        },
        {
          path: 'extra',
          name: 'TeacherExtra',
          component: () => import('@/pages/teacher/Extra.vue'),
        },
        {
          path: 'evaluation',
          name: 'TeacherEvaluation',
          component: () => import('@/pages/teacher/Evaluation.vue'),
        },
        {
          path: 'profile',
          name: 'TeacherProfile',
          component: () => import('@/pages/Profile.vue'),
        },
      ],
    },
    {
      path: '/student',
      component: Layout,
      redirect: '/',
      children: [
        {
          path: 'courses',
          name: 'StudentCourses',
          component: () => import('@/pages/student/Courses.vue'),
        },
        {
          path: 'courses/:courseId/homeworks/:homeworkId/result',
          name: 'StudentHomeworkResult',
          component: () => import('@/pages/student/HomeworkResult.vue'),
        },
        {
          path: 'courses/:id',
          name: 'StudentCourseLearn',
          component: () => import('@/pages/student/CourseLearn.vue'),
        },
        {
          path: 'schedule',
          name: 'StudentSchedule',
          component: () => import('@/pages/student/Schedule.vue'),
        },
        {
          path: 'progress',
          name: 'StudentProgress',
          component: () => import('@/pages/student/Progress.vue'),
        },
        {
          path: 'profile',
          name: 'StudentProfile',
          component: () => import('@/pages/Profile.vue'),
        },
        {
          path: 'grades',
          name: 'StudentGrades',
          component: () => import('@/pages/student/Grades.vue'),
        },
        {
          path: 'extra',
          name: 'StudentExtra',
          component: () => import('@/pages/student/Extra.vue'),
        },
      ],
    },
    {
      path: '/mentor',
      component: Layout,
      redirect: '/',
      children: [
        {
          path: 'courses',
          name: 'MentorCourses',
          component: () => import('@/pages/teacher/Courses.vue'),
        },
        {
          path: 'schedule',
          name: 'MentorSchedule',
          component: () => import('@/pages/teacher/Schedule.vue'),
        },
        {
          path: 'courses/:id',
          name: 'MentorCourseDetail',
          component: () => import('@/pages/teacher/CourseDetail.vue'),
        },
        {
          path: 'extra',
          name: 'MentorExtra',
          component: () => import('@/pages/teacher/Extra.vue'),
        },
        {
          path: 'profile',
          name: 'MentorProfile',
          component: () => import('@/pages/Profile.vue'),
        },
      ],
    },
    {
      path: '/leader',
      component: Layout,
      redirect: '/',
      children: [
        {
          path: 'courses',
          name: 'LeaderCourses',
          component: () => import('@/pages/leader/Courses.vue'),
        },
        {
          path: 'courses/:id',
          name: 'LeaderCourseDetail',
          component: () => import('@/pages/teacher/CourseDetail.vue'),
        },
        {
          path: 'students',
          name: 'LeaderStudents',
          component: () => import('@/pages/leader/Students.vue'),
        },
        {
          path: 'profile',
          name: 'LeaderProfile',
          component: () => import('@/pages/Profile.vue'),
        },
      ],
    },
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
})

export default router
