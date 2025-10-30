/* npm install expo-camera expo-location - 이 명령어들 설치할 것 */


import React, { useState, useEffect, useRef } from "react";
import { View, Button, Text, Image, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";

export default function TumblerMissionScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mission, setMission] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const cameraRef = useRef(null);
  const userId = "user123"; // 실제 로그인된 사용자 ID로 교체

  useEffect(() => {
    checkLocationAndCreateMission();
  }, []);

  async function checkLocationAndCreateMission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("위치 권한이 필요합니다.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    const NURIGWAN_LAT = 37.632;
    const NURIGWAN_LON = 127.056;
    const distance = calcDistance(latitude, longitude, NURIGWAN_LAT, NURIGWAN_LON);

    if (distance > 1000) {
      Alert.alert("학생누리관 반경 1km 이내에서만 미션이 활성화됩니다.");
      return;
    }

    const missionData = await createMission(userId);
    if (missionData) {
      setMission(missionData);
      Alert.alert("미션이 활성화되었습니다. 10분 안에 텀블러를 촬영하세요.");
    }
  }

  function calcDistance(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function createMission(userId) {
    try {
      const formData = new FormData();
      formData.append("user_id", userId);

      const res = await fetch("http://<서버주소>:8000/create_mission", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Mission created:", data);
      return data;
    } catch (e) {
      console.error(e);
      Alert.alert("미션 생성 실패");
      return null;
    }
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setPhotoUri(photo.uri);
  }

  async function verifyMission() {
    if (!mission || !photoUri) {
      Alert.alert("사진과 미션 정보가 필요합니다.");
      return;
    }

    setIsVerifying(true);
    const result = await verifyExif(photoUri, userId, mission.mission_id);
    setIsVerifying(false);

    if (result.verified) {
      Alert.alert("인증 성공", "크레딧이 지급됩니다.");
    } else {
      Alert.alert("인증 실패", result.reason || "조건 불충족");
    }
  }

  async function verifyExif(photoUri, userId, missionId) {
    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("mission_id", missionId);
      formData.append("file", {
        uri: photoUri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      /*백엔드 서버 주소로 변경해*/
      const response = await fetch("http://<서버주소>:8000/verify_exif", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Verification result:", result);
      return result;
    } catch (e) {
      console.error(e);
      Alert.alert("서버 통신 실패");
      return { verified: false };
    }
  }

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>카메라 권한이 필요합니다.</Text>
        <Button onPress={requestPermission} title="권한 요청" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!photoUri ? (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          ratio="16:9"
        />
      ) : (
        <Image
          source={{ uri: photoUri }}
          style={{ flex: 1, resizeMode: "contain" }}
        />
      )}

      <View style={{ padding: 20 }}>
        {!photoUri ? (
          <Button title="사진 찍기" onPress={takePhoto} />
        ) : (
          <>
            <Button title="사진 다시 찍기" onPress={() => setPhotoUri(null)} />
            <View style={{ height: 10 }} />
            <Button
              title={isVerifying ? "인증 중..." : "인증하기"}
              onPress={verifyMission}
              disabled={isVerifying}
            />
          </>
        )}
      </View>
    </View>
  );
}
