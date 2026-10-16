package com.studymarket.challenge;
import com.studymarket.user.User;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserChallengeRepository extends JpaRepository<UserChallenge,Long>{Optional<UserChallenge> findByUserAndChallenge(User u,Challenge c);List<UserChallenge> findAllByUserOrderByCreatedAtAsc(User u);}