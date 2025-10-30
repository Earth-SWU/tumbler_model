package com.tumbler.ecostep.controller;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.GpsDirectory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
public class MissionController {

    private final Map<String, Mission> missionMap = new HashMap<>();

    private static final double NURIGWAN_LAT = 37.632;
    private static final double NURIGWAN_LON = 127.056;

    @PostMapping("/create_mission")
    public Map<String, Object> createMission(@RequestParam String user_id) {
        String missionId = UUID.randomUUID().toString();
        LocalDateTime startTime = LocalDateTime.now();

        missionMap.put(missionId, new Mission(user_id, startTime));

        Map<String, Object> response = new HashMap<>();
        response.put("mission_id", missionId);
        response.put("start_time", startTime.toString());
        response.put("expires_in", 600);
        return response;
    }

    @PostMapping("/verify_exif")
    public Map<String, Object> verifyExif(
            @RequestParam("user_id") String userId,
            @RequestParam("mission_id") String missionId,
            @RequestParam("file") MultipartFile file
    ) {
        Map<String, Object> result = new HashMap<>();

        try {
            Mission mission = missionMap.get(missionId);
            if (mission == null) {
                result.put("verified", false);
                result.put("reason", "Mission not found");
                return result;
            }

            InputStream inputStream = file.getInputStream();
            Metadata metadata = ImageMetadataReader.readMetadata(inputStream);
            GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);

            if (gpsDirectory == null || gpsDirectory.getGeoLocation() == null) {
                result.put("verified", false);
                result.put("reason", "No GPS info found");
                return result;
            }

            double lat = gpsDirectory.getGeoLocation().getLatitude();
            double lon = gpsDirectory.getGeoLocation().getLongitude();

            double distance = calcDistance(lat, lon, NURIGWAN_LAT, NURIGWAN_LON);

            LocalDateTime now = LocalDateTime.now();
            long minutes = ChronoUnit.MINUTES.between(mission.startTime, now);

            if (distance <= 1000 && minutes <= 10) {
                result.put("verified", true);
                result.put("reason", "Valid location and time");
            } else {
                result.put("verified", false);
                result.put("reason", "Invalid location or expired mission");
            }

        } catch (Exception e) {
            result.put("verified", false);
            result.put("reason", "Error reading EXIF: " + e.getMessage());
        }

        return result;
    }

    private double calcDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000; // meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    static class Mission {
        String userId;
        LocalDateTime startTime;

        Mission(String userId, LocalDateTime startTime) {
            this.userId = userId;
            this.startTime = startTime;
        }
    }
}
