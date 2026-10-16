package com.studymarket.challenge;

import com.studymarket.user.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

	boolean existsByUserAndAchievement(User user, Achievement achievement);

	List<UserAchievement> findAllByUserOrderByUnlockedAtAsc(User user);
}