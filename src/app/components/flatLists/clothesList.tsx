import React, { useEffect, useRef, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, Dimensions, Text, ImageBackground, ScrollView, Animated, Easing, ActivityIndicator, BackHandler, Pressable } from "react-native";
import { useForm, SubmitHandler } from 'react-hook-form';
import _isEqual from 'lodash/isEqual';

import { Clothing } from "@/src/services/types/types";
import { useClothes } from "@/src/services/contexts/clothesContext";
import Modal from "../modals/modal";
import Api from "@/src/services/api";

import { MaterialIcons, FontAwesome5, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { globalColors, globalStyles } from "@/src/styles/global";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "expo-router";
import MyButton from "../button/button";
import ConfirmationModal from "../modals/confirmationModal";
import { Picker } from "@react-native-picker/picker";
import { clothingKind } from "@/src/services/local-data/pickerData";

const { width } = Dimensions.get('window');

type FormData = {
    fav?: boolean;
    dirty?: boolean;
}

const ClothesList = React.memo(({
    clothes,
    clothingBg,
    canOpen,
    typeFilter,
    canPick,
    canSelect,
    pickParam,
    operations,
    additionalOperation,
    additionalOperationOnPress,
    buttonTitle,
    buttonOnPress,
    buttonLoading,
    buttonIcon,
    pickerFilter,
    fixedSelectMode
}:
    {
        clothes: Clothing[],
        clothingBg: string,
        canOpen?: boolean,
        typeFilter?: string,
        canPick?: boolean,
        canSelect?: boolean,
        pickParam?: (string | undefined)[],
        operations?: boolean | string[],
        additionalOperation?: keyof typeof MaterialIcons.glyphMap,
        additionalOperationOnPress?: () => void,
        buttonTitle?: string,
        buttonOnPress?: () => void,
        buttonLoading?: boolean,
        buttonIcon?: string,
        pickerFilter?: boolean
        fixedSelectMode?: boolean
    }) => {

    const [openModal, setOpenModal] = useState<boolean>(false);
    const [openClothing, setOpenClothing] = useState<Clothing | null>(null);
    const [editClothing, setEditClothing] = useState<boolean>(false);
    const [selectMode, setSelectMode] = useState<boolean>(false);
    const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState<boolean>(false);
    const [screenLoading, setScreenLoading] = useState<boolean>(false);
    const [favIcon, setFavIcon] = useState<"favorite" | "heart-broken">("favorite");
    const [dirtyIcon, setDirtyIcon] = useState<"washing-machine" | "washing-machine-off">("washing-machine");
    const [confirmationModal, setConfirmationModal] = useState<boolean>(false);
    const [confirmationModalwash, setConfirmationModalwash] = useState<boolean>(false);
    const [pickerFilterValue, setPickerFilterValue] = useState<string>("");

    const { getClothes, setSelectedClothingId, selectedClothingId, setSelectedClothesIds } = useClothes();

    useFocusEffect(React.useCallback(() => {
        const onBackAction = () => {
            if (selectMode) {
                setSelectMode(false);
                setSelectedClothes([]);
                return true;
            }
            return false;
        }
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackAction
        );

        return () => backHandler.remove();
    }, [selectMode]))

    const form = useForm<FormData>({
        defaultValues: {
            fav: openClothing?.fav ?? false,
            dirty: openClothing?.dirty ?? false,
        },
    });

    const { watch, setValue, handleSubmit, reset } = form;

    const favoriteValue = watch('fav');

    const editAnimation = useRef(new Animated.Value(0)).current;
    const favAnimation = useRef(new Animated.Value(0)).current;

    const handleOpenClothing = (clothing: Clothing) => {
        if (canOpen === true && selectMode === false) {
            setOpenClothing(clothing);
            reset(clothing);
            setOpenModal(true);
        }
    };

    const hasFormChanged = (initialData: FormData, currentData: FormData) => {
        return !_isEqual(initialData, currentData);
    };

    const onSubmitUpdateClothing = async (param: string | string[], data: FormData) => {
        setScreenLoading(true);

        await Api.put(`/clothing/${param}`, data)
            .then(response => {
                console.log(response.data);
                if (confirmationModalwash) setConfirmationModalwash(false);
                getClothes();
            })
            .catch(error => {
                console.log(error.response.data);
                Toast.show({
                    type: "error",
                    text1: error.response.data.msg,
                    text2: "Tente novamente"
                })
            })
            .finally(() => {
                if (selectMode) {
                    setSelectedClothes([]);
                    setSelectMode(false);
                }

                setScreenLoading(false);
            });
    };

    const onSubmitDelClothing = async () => {
        setScreenLoading(true);

        await Api.delete(`/clothing/${selectedClothes}`)
            .then(response => {
                console.log(response.data);
                getClothes();
                setConfirmationModal(false);

                if (selectMode === false) {
                    setOpenModal(false);
                    reset();
                }
            })
            .catch(error => {
                console.log(error.response.data);
                Toast.show({
                    type: "error",
                    text1: error.response.data.msg,
                    text2: "Tente novamente"
                })

                setSelectedClothes([]);
            })
            .finally(() => {
                if (selectMode === true) {
                    setSelectMode(false);
                    setSelectedClothes([]);
                }

                setScreenLoading(false);

                Toast.show({
                    type: "error",
                    text1: `Roupa${selectedClothes.length > 1 ? "s" : ""} excluída${selectedClothes.length > 1 ? "s" : ""}`
                });
            });
    };

    const editClothingStyle = {
        height: editAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: ["100%", "40%"],
        }),
        borderBottomWidth: editAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 3],
        }),
    };

    const handleFavClothing = () => {
        Animated.sequence([
            Animated.timing(favAnimation, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(favAnimation, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setValue('fav', !favoriteValue);
        });
    }

    const favClothingStyle = {
        transform: [
            {
                scale: favAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.5],
                }),
            },
        ],
    }

    const handleUpdateOpenClothing: SubmitHandler<FormData> = async (data) => {
        if (openClothing && hasFormChanged(openClothing, data)) {
            await onSubmitUpdateClothing(openClothing._id, data);
        }
    }

    const handleCloseModal = async () => {
        await handleSubmit(handleUpdateOpenClothing)();
        setOpenModal(false);
        setOpenClothing(null);
        setEditClothing(false);
        editAnimation.setValue(0);
        favAnimation.setValue(0);
    };

    const filteredClothes = clothes.filter(item => item.type === typeFilter);

    const handlePickClothing = (clothingId: string) => {
        if (canPick) {
            if (selectedClothingId === clothingId) {
                setSelectedClothingId(undefined);
            } else {
                setSelectedClothingId(clothingId);
            }
        }
    };

    const handleSelectClothing = (clothingId: string) => {
        if (canSelect) {
            if (selectedClothes.includes(clothingId)) {
                setSelectedClothes(selectedClothes.filter(item => item !== clothingId));
            } else {
                setSelectedClothes([...selectedClothes, clothingId]);
            }
        }
    }

    const handleSelectAll = () => {
        if (selectedClothes.length === clothes.length) {
            setSelectedClothes([]);
        } else {
            setSelectedClothes(clothes.map(item => item._id));
        }
    }

    const handleCloseSelectMode = () => {
        setSelectMode(false);
        setSelectedClothes([]);
        setSelectAll(false);
    }

    const selectedClothesOperations = async () => {
        const currentClothes = clothes.filter(item => selectedClothes.includes(item._id));

        if (currentClothes.every(item => item.fav === true) && currentClothes.length > 0) {
            setFavIcon("heart-broken");
        } else {
            setFavIcon("favorite");
        }

        if (currentClothes.every(item => item.dirty === true) && currentClothes.length > 0) {
            setDirtyIcon("washing-machine-off");
        } else {
            setDirtyIcon("washing-machine");
        }
    }

    const SelectAllButton = () => {
        return (
            <TouchableOpacity onPress={() => { setSelectAll(!selectAll), handleSelectAll() }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialIcons name={selectAll ? "check-circle" : "radio-button-unchecked"} color={selectAll ? globalColors.primary : "black"} size={24} />
                <Text>Selecionar tudo</Text>
            </TouchableOpacity>
        );
    };

    const filteredClothesByPicker = () => {
        if (pickerFilterValue === "all" || pickerFilterValue === "") {
            return [...clothes].reverse();
        } else {
            return clothes.filter(item => item.kind === pickerFilterValue).reverse();
        }
    };

    const activeOperations = selectedClothes.length > 0 ? globalColors.primary : "gray";

    useEffect(() => {
        selectedClothesOperations();

        if ((buttonTitle || additionalOperation) && (canSelect || fixedSelectMode)) {
            setSelectedClothesIds(selectedClothes);
        }

        if (selectAll) {
            if (selectedClothes.length < clothes.length) {
                setSelectAll(false)
            }
        }
    }, [selectedClothes]);

    useEffect(() => {
        if (fixedSelectMode) {
            setSelectMode(true);
        }
    }, []);

    return (
        <View style={{ alignItems: "center", flex: 1 }}>
            {pickerFilter &&
                <View style={[globalStyles.pickerContainer, { width: "90%", marginTop: 10, marginBottom: 20 }]}>
                    <Picker
                        selectedValue={pickerFilterValue}
                        onValueChange={(itemValue) => setPickerFilterValue(itemValue)}
                    >
                        <Picker.Item label="Todas" value="all" />
                        {clothingKind.map(item => (
                            <Picker.Item key={item.value} label={item.label} value={item.value} />
                        ))}
                    </Picker>
                </View>
            }

            {selectMode &&
                <View style={[{ paddingBottom: 10, width: "100%", paddingHorizontal: 15 }, fixedSelectMode && { flexDirection: "row", justifyContent: "space-between" }]}>
                    {fixedSelectMode &&
                        <SelectAllButton />
                    }

                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            {!fixedSelectMode &&
                                <TouchableOpacity onPress={handleCloseSelectMode}>
                                    <MaterialIcons name="close" size={22} color={"#000"} />
                                </TouchableOpacity>
                            }
                            <Text>{`${selectedClothes.length} Roupas`}</Text>
                        </View>

                        {!fixedSelectMode &&
                            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                                {additionalOperation &&
                                    <TouchableOpacity onPress={additionalOperationOnPress}>
                                        <MaterialIcons name={additionalOperation} size={24} color={activeOperations} />
                                    </TouchableOpacity>
                                }
                                {(Array.isArray(operations) && operations.includes("fav")) || operations === true ? (
                                    <TouchableOpacity onPress={() => { selectedClothes.length > 0 && onSubmitUpdateClothing(selectedClothes, { fav: favIcon === "favorite" }) }}>
                                        <MaterialIcons name={favIcon} size={24} color={activeOperations} />
                                    </TouchableOpacity>
                                ) : null}

                                {(Array.isArray(operations) && operations.includes("dirty")) || operations === true ? (
                                    <TouchableOpacity onPress={() => { selectedClothes.length > 0 && setConfirmationModalwash(true) }}>
                                        <MaterialCommunityIcons name={dirtyIcon} size={26} color={activeOperations} />
                                    </TouchableOpacity>
                                ) : null}

                                {(Array.isArray(operations) && operations.includes("delete")) || operations === true ? (
                                    <TouchableOpacity onPress={() => { selectedClothes.length > 0 && setConfirmationModal(true) }}>
                                        <FontAwesome5 name="trash" size={22} color={activeOperations} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        }
                    </View>

                    {!fixedSelectMode &&
                        <SelectAllButton />
                    }
                </View>
            }

            {pickerFilter && filteredClothesByPicker().length === 0 &&
                <View style={globalStyles.message}>
                    <Text>Nenhuma roupa desse tipo encontrada</Text>
                </View>
            }

            <FlatList
                data={typeFilter ? [...filteredClothes].reverse() : pickerFilter ? filteredClothesByPicker() : [...clothes].reverse()}
                renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.itemContainer, { backgroundColor: clothingBg }, item.dirty && { borderColor: globalColors.dirtyGreen, borderWidth: 1 }]} onPress={() => { handleOpenClothing(item), handlePickClothing(item._id), selectMode && handleSelectClothing(item._id) }} onLongPress={() => canSelect && (setSelectMode(true), handleSelectClothing(item._id))}>
                        <View style={styles.imageContainer}>
                            <ImageBackground source={{ uri: item.image }} style={[{ flex: 1, justifyContent: selectMode ? "flex-start" : "flex-end", alignItems: 'flex-end', padding: 5 }, selectedClothes.includes(item._id) && selectMode && { opacity: 0.5 }]}>
                                <View>
                                    {item.fav && <MaterialIcons name="favorite" color="red" size={16} />}
                                    {item.dirty && <MaterialCommunityIcons name="washing-machine" size={16} style={{ backgroundColor: "#fff", borderRadius: 3 }} />}
                                </View>
                                {canPick && (
                                    pickParam?.includes(item._id) && <MaterialIcons name="check-circle" color={globalColors.primary} size={22} style={{ position: "absolute", right: 1, bottom: 1, backgroundColor: "#fff", borderRadius: 100 }} />
                                )}
                            </ImageBackground>
                            {selectMode &&
                                <MaterialIcons name={selectedClothes.includes(item._id) ? "check-circle" : "radio-button-unchecked"} color={selectedClothes.includes(item._id) ? globalColors.primary : "black"} size={22} style={{ position: "absolute", right: 1, bottom: 1, backgroundColor: "#fff", borderRadius: 100 }} />
                            }
                        </View>
                    </TouchableOpacity>
                )}
                keyExtractor={(item) => item._id}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: selectMode ? 40 : 20 }}
            />

            {
                canOpen === true && openClothing && (
                    <View key={openClothing._id}>
                        <Modal isOpen={openModal} onRequestClose={handleCloseModal}>
                            <View style={styles.modalContent}>
                                <Animated.View style={[{ borderRadius: 5, overflow: 'hidden', paddingBottom: 10 }, editClothingStyle]}>
                                    <ImageBackground source={{ uri: openClothing.image }} style={{ flex: 1, padding: 5 }} resizeMode="contain">
                                        <TouchableOpacity onPress={handleCloseModal}>
                                            <Ionicons name="chevron-back" style={styles.icon} size={26} color={globalColors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={{ position: 'absolute', right: 10, bottom: 10 }} onPress={handleFavClothing}>
                                            <Animated.View style={favClothingStyle}>
                                                <MaterialIcons name={favoriteValue === true ? "favorite" : "favorite-border"} color={favoriteValue === true ? "red" : styles.icon.color} size={26} />
                                            </Animated.View>
                                        </TouchableOpacity>
                                    </ImageBackground>
                                </Animated.View>

                                {editClothing === true &&
                                    <View>
                                        <ScrollView>
                                            <View style={{ marginTop: 20, gap: 20, alignItems: "center" }}>
                                                <Text style={styles.clothingAtributes}>{openClothing.color}</Text>
                                                <Text style={styles.clothingAtributes}>{openClothing.gender}</Text>
                                                <Text style={styles.clothingAtributes}>{openClothing.kind}</Text>
                                                <Text style={styles.clothingAtributes}>{openClothing.style}</Text>
                                                <Text style={styles.clothingAtributes}>{openClothing.temperature}</Text>
                                                <Text style={styles.clothingAtributes}>{openClothing.tissue}</Text>
                                            </View>
                                        </ScrollView>
                                    </View>
                                }
                            </View>
                        </Modal>
                    </View>
                )
            }

            {
                buttonTitle &&
                <View style={{ paddingHorizontal: 20, width: "100%", paddingBottom: 20 }}>
                    <MyButton title={buttonTitle} onPress={buttonOnPress} loading={buttonLoading} icon={buttonIcon} />
                </View>
            }

            {
                screenLoading &&
                <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.2)", justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size={100} color={globalColors.primary} />
                </View>
            }

            <ConfirmationModal isOpen={confirmationModal} onRequestClose={() => setConfirmationModal(false)} onSubmit={onSubmitDelClothing} title={`Excluir roupa${selectedClothes.length > 1 ? "s" : ""}`} color="red" description="Essa ação não poderá ser desfeita" buttonTitle="Excluir" />

            <ConfirmationModal isOpen={confirmationModalwash} onRequestClose={() => setConfirmationModalwash(false)} onSubmit={() => onSubmitUpdateClothing(selectedClothes, { dirty: dirtyIcon === "washing-machine" })} title={dirtyIcon === "washing-machine" ? "Mandar para lavanderia" : "Lavar roupas"} description={dirtyIcon === "washing-machine" ? "Suas roupas serão realocadas para a aba lavanderia" : "Suas roupas retornarão ao seu armário"} color="green" buttonTitle="Confirmar" />
        </View >
    )
});

const styles = StyleSheet.create({
    itemContainer: {
        margin: 5,
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    imageContainer: {
        height: width * 0.25,
        width: width * 0.25,
        borderRadius: 5,
        overflow: 'hidden',
    },
    modalContent: {
        backgroundColor: "#fff",
        height: "75%",
        width: "90%",
        borderRadius: 10,
        padding: 10
    },
    icon: {
        color: "rgba(0, 0, 0, 0.70)",
    },
    clothingAtributes: {
        fontSize: 20,
        fontWeight: "500"
    },
});

export default ClothesList;