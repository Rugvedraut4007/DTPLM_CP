package com.studymarket.user;

import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class UserService {

	private final UserRepository userRepository;

	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public User createUser(String username, String email) {
		return userRepository.save(new User(username, email));
	}

	public Optional<User> getUserById(Long id) {
		return userRepository.findById(id);
	}
}