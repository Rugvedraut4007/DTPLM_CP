package com.studymarket.trading;

import com.studymarket.user.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TradeRepository extends JpaRepository<Trade, Long> {
	List<Trade> findTop5ByUserOrderByCreatedAtDesc(User user);
	List<Trade> findAllByUser(User user);
}