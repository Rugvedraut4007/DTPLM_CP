package com.studymarket.portfolio;

import com.studymarket.asset.Asset;
import com.studymarket.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PositionRepository extends JpaRepository<Position, Long> {

	Optional<Position> findByUserAndAsset(User user, Asset asset);

	List<Position> findAllByUser(User user);
}