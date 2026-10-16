package com.studymarket;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class StudyMarketBackendApplication {

	@Bean
	Clock applicationClock() {
		return Clock.systemUTC();
	}

	public static void main(String[] args) {
		SpringApplication.run(StudyMarketBackendApplication.class, args);
	}

}
